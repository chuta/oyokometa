import { Hono } from "hono";
import { and, desc, eq, lte, sql } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  getDb,
  creditProducts,
  creditWallets,
  creditLedger,
  payments,
  users,
  ensureWallet,
  actionPrices,
} from "@oyokometa/db";
import { randomUUID } from "node:crypto";
import { bankDetails, formatAmount, generateTransferReference } from "../bank.js";
import { BachsRequestError, bachsApiKey, bachsMode, isPublicReturnUrl } from "../bachs.js";
import { createBachsCheckout, syncBachsCustomer, syncBachsProduct } from "../bachs-checkout.js";
import { billingAddressFromUser } from "../billing-profile.js";
import { audit } from "../audit.js";
import { sendAdminNotice, sendTransferInstructions } from "../email.js";
import { publicAppOrigin } from "../origin.js";
import { nextPaymentStatus } from "../payment-state.js";
import { transferCooldownRemaining, transferWaitLabel } from "../transfer-cooldown.js";

export const creditRoutes = new Hono();

creditRoutes.get("/credits/actions", async (c) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(actionPrices)
    .where(lte(actionPrices.effectiveFrom, new Date()))
    .orderBy(actionPrices.effectiveFrom);
  const latest = new Map<string, number>();
  for (const r of rows) latest.set(r.action, r.credits);
  return c.json({ actions: Object.fromEntries(latest) });
});

creditRoutes.get("/credits/products", async (c) => {
  const db = getDb();
  const rows = await db.select().from(creditProducts).where(eq(creditProducts.active, true));
  return c.json({
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      credits: p.credits,
      currency: p.currency,
      price_minor: p.priceMinor,
      price_label: formatAmount(p.priceMinor, p.currency),
      usd_price_label: p.usdPriceMinor != null ? formatAmount(p.usdPriceMinor, "USD") : null,
    })),
  });
});

creditRoutes.get("/credits", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const wallet = await ensureWallet(auth.user.id);
  const db = getDb();
  const [latest] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, auth.user.id), eq(payments.provider, "bank_transfer")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  const remainingMs = transferCooldownRemaining(latest?.createdAt ?? null, new Date());
  const open =
    latest &&
    remainingMs > 0 &&
    (latest.status === "awaiting_transfer" || latest.status === "awaiting_match");
  return c.json({
    balance: wallet.cachedBalance,
    wallet_id: wallet.id,
    transfer_retry_after_seconds: Math.ceil(remainingMs / 1000),
    open_payment_id: open ? latest.id : null,
  });
});

creditRoutes.get("/credits/ledger", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.userId, auth.user.id)).limit(1);
  if (!wallet) return c.json({ entries: [] });
  const rows = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.walletId, wallet.id))
    .orderBy(desc(creditLedger.createdAt))
    .limit(100);
  return c.json({
    entries: rows.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount,
      balance_after: r.balanceAfter,
      created_at: r.createdAt,
      reference_type: r.referenceType,
    })),
  });
});

creditRoutes.post("/payments/intents", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (!auth.user.emailVerified) {
    return c.json(apiError(ERROR_CODES.email_unverified, "Verify your email before buying credits", auth.requestId), 403);
  }
  const user = auth.user;
  const body = await c.req.json<{ product_id?: string }>();
  const db = getDb();
  const [product] = await db
    .select()
    .from(creditProducts)
    .where(eq(creditProducts.id, body.product_id ?? ""))
    .limit(1);
  if (!product || !product.active) {
    return c.json(apiError(ERROR_CODES.validation_error, "Unknown pack", auth.requestId), 400);
  }
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}::text))`);
    const [latest] = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.userId, user.id), eq(payments.provider, "bank_transfer")))
      .orderBy(desc(payments.createdAt))
      .limit(1);
    const remainingMs = transferCooldownRemaining(latest?.createdAt ?? null, new Date());
    if (remainingMs > 0 && latest) {
      return { blocked: true as const, remainingMs, paymentId: latest.id };
    }
    let reference = generateTransferReference();
    for (let i = 0; i < 5; i++) {
      const [clash] = await tx.select().from(payments).where(eq(payments.referenceCode, reference)).limit(1);
      if (!clash) break;
      reference = generateTransferReference();
    }
    const [payment] = await tx
      .insert(payments)
      .values({
        userId: user.id,
        provider: "bank_transfer",
        providerRef: reference,
        productId: product.id,
        amountMinor: product.priceMinor,
        currency: product.currency,
        status: "awaiting_transfer",
        referenceCode: reference,
        creditsGranted: 0,
      })
      .returning();
    return { blocked: false as const, payment, reference };
  });
  if (created.blocked) {
    const seconds = Math.ceil(created.remainingMs / 1000);
    c.header("Retry-After", String(seconds));
    return c.json(
      {
        ...apiError(
          ERROR_CODES.rate_limited,
          `You can start another bank transfer in ${transferWaitLabel(created.remainingMs)}.`,
          auth.requestId,
        ),
        retry_after_seconds: seconds,
        payment_id: created.paymentId,
      },
      429,
    );
  }
  const { payment, reference } = created;
  if (!payment) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create payment", auth.requestId), 503);
  }
  const bank = await bankDetails();
  await audit(auth.user.id, "payment.intent", payment.id, undefined, { reference, product: product.name });
  const payUrl = `${publicAppOrigin()}/credits/pay/${payment.id}`;
  try {
    await sendTransferInstructions({
      email: auth.user.email,
      amountLabel: formatAmount(product.priceMinor, product.currency),
      credits: product.credits,
      reference,
      bank,
      payUrl,
    });
    await sendAdminNotice(`Transfer started ${reference}`, [
      `${auth.user.email} started a bank transfer for ${product.credits} credits.`,
      `Reference ${reference}. Amount ${formatAmount(product.priceMinor, product.currency)}.`,
    ]);
  } catch (err) {
    console.error(JSON.stringify({ msg: "payment_email_failed", message: (err as Error).message }));
  }
  return c.json({
    payment_id: payment.id,
    reference,
    credits: product.credits,
    amount_minor: product.priceMinor,
    amount_label: formatAmount(product.priceMinor, product.currency),
    currency: product.currency,
    bank,
    instructions:
      "Transfer the exact amount to the account below. Put the reference in the narration / payment description so we can match your deposit.",
  });
});

creditRoutes.post("/payments/bachs/checkouts", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (!auth.user.emailVerified) {
    return c.json(apiError(ERROR_CODES.email_unverified, "Verify your email before buying credits", auth.requestId), 403);
  }
  if (!bachsApiKey()) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Online payment is not configured", auth.requestId), 503);
  }
  const origin = publicAppOrigin();
  const body = await c.req.json<{ product_id?: string }>().catch(() => ({}) as { product_id?: string });
  const db = getDb();
  const [product] = await db
    .select()
    .from(creditProducts)
    .where(eq(creditProducts.id, body.product_id ?? ""))
    .limit(1);
  if (!product || !product.active) {
    return c.json(apiError(ERROR_CODES.validation_error, "Unknown pack", auth.requestId), 400);
  }
  if (product.usdPriceMinor == null || product.usdPriceMinor <= 0) {
    return c.json(apiError(ERROR_CODES.validation_error, "This pack is not available for online payment yet", auth.requestId), 400);
  }
  const successUrl = `${origin}/credits/pay/pending`;
  const cancelUrl = `${origin}/credits`;
  if (!isPublicReturnUrl(successUrl) || !isPublicReturnUrl(cancelUrl)) {
    return c.json(
      apiError(ERROR_CODES.service_unavailable, "Online checkout needs a public site address", auth.requestId),
      503,
    );
  }

  const user = auth.user;
  const sandbox = bachsMode() === "sandbox";
  const [profile] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const storedCustomerId = sandbox ? profile?.bachsSandboxCustomerId : profile?.bachsCustomerId;
  let customerId = storedCustomerId ?? null;
  if (profile) {
    try {
      customerId = await syncBachsCustomer({
        userId: profile.id,
        email: profile.email,
        name: profile.displayName,
        phone: profile.phone,
        billing: billingAddressFromUser(profile),
        customerId: storedCustomerId ?? null,
      });
      if (customerId !== storedCustomerId) {
        await db
          .update(users)
          .set(
            sandbox
              ? { bachsSandboxCustomerId: customerId, updatedAt: new Date() }
              : { bachsCustomerId: customerId, updatedAt: new Date() },
          )
          .where(eq(users.id, profile.id));
      }
    } catch (err) {
      const code = err instanceof BachsRequestError ? err.code : null;
      console.error(JSON.stringify({ msg: "bachs_customer_sync_failed", code }));
    }
  }
  const [existing] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.userId, user.id),
        eq(payments.productId, product.id),
        eq(payments.provider, "bachs"),
        eq(payments.status, "checkout_open"),
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(1);
  const reusable =
    existing?.checkoutUrl &&
    existing.createdAt.getTime() > Date.now() - 50 * 60 * 1000;
  if (existing && reusable) {
    return c.json({
      payment_id: existing.id,
      checkout_url: existing.checkoutUrl,
      credits: product.credits,
      amount_label: formatAmount(existing.amountMinor, existing.currency),
    });
  }

  const paymentId = randomUUID();
  const realSuccess = `${origin}/credits/pay/${paymentId}`;
  if (!isPublicReturnUrl(realSuccess)) {
    return c.json(
      apiError(ERROR_CODES.service_unavailable, "Online checkout needs a public site address", auth.requestId),
      503,
    );
  }
  const [payment] = await db
    .insert(payments)
    .values({
      id: paymentId,
      userId: user.id,
      provider: "bachs",
      productId: product.id,
      amountMinor: product.usdPriceMinor,
      currency: "USD",
      status: "checkout_open",
      referenceCode: paymentId,
      creditsGranted: 0,
    })
    .returning();
  if (!payment) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create payment", auth.requestId), 503);
  }

  try {
    let bachsProduct = sandbox ? product.bachsSandboxProductId : product.bachsProductId;
    if (!bachsProduct) {
      bachsProduct = await syncBachsProduct({
        id: product.id,
        name: product.name,
        credits: product.credits,
        currency: product.currency,
        priceMinor: product.priceMinor,
        usdPriceMinor: product.usdPriceMinor,
        bachsProductId: null,
      });
      await db
        .update(creditProducts)
        .set(
          sandbox
            ? { bachsSandboxProductId: bachsProduct, updatedAt: new Date() }
            : { bachsProductId: bachsProduct, updatedAt: new Date() },
        )
        .where(eq(creditProducts.id, product.id));
    } else {
      await syncBachsProduct({
        id: product.id,
        name: product.name,
        credits: product.credits,
        currency: product.currency,
        priceMinor: product.priceMinor,
        usdPriceMinor: product.usdPriceMinor,
        bachsProductId: bachsProduct,
      });
    }
    const checkout = await createBachsCheckout({
      paymentId: payment.id,
      bachsProductId: bachsProduct,
      productId: product.id,
      email: user.email,
      name: profile?.displayName ?? null,
      phone: profile?.phone ?? null,
      customerId,
      credits: product.credits,
      successUrl: realSuccess,
      cancelUrl,
    });
    await db
      .update(payments)
      .set({ providerRef: checkout.checkoutId, checkoutUrl: checkout.checkoutUrl, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    await audit(user.id, "payment.bachs.checkout", payment.id, undefined, { product: product.name });
    return c.json({
      payment_id: payment.id,
      checkout_url: checkout.checkoutUrl,
      credits: product.credits,
      amount_label: formatAmount(product.usdPriceMinor, "USD"),
    });
  } catch (err) {
    await db
      .update(payments)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, "checkout_open")));
    const code = err instanceof BachsRequestError ? err.code : null;
    console.error(JSON.stringify({ msg: "bachs_checkout_failed", code, message: (err as Error).message }));
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not start online payment", auth.requestId), 503);
  }
});

creditRoutes.get("/payments/:id", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, c.req.param("id"))).limit(1);
  if (!payment || payment.userId !== auth.user.id) {
    return c.json({ error: { code: "not_found", message: "Not found", request_id: auth.requestId } }, 404);
  }
  const bank = await bankDetails();
  const [product] = payment.productId
    ? await db.select().from(creditProducts).where(eq(creditProducts.id, payment.productId)).limit(1)
    : [];
  return c.json({
    payment_id: payment.id,
    provider: payment.provider,
    status: payment.status,
    reference: payment.referenceCode,
    credits: product?.credits ?? payment.creditsGranted,
    amount_label: formatAmount(payment.amountMinor, payment.currency),
    checkout_url: payment.provider === "bachs" && payment.status === "checkout_open" ? payment.checkoutUrl : null,
    bank: payment.provider === "bank_transfer" ? bank : null,
  });
});

creditRoutes.post("/payments/:id/confirm", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, c.req.param("id"))).limit(1);
  if (!payment || payment.userId !== auth.user.id) {
    return c.json({ error: { code: "not_found", message: "Not found", request_id: auth.requestId } }, 404);
  }
  if (payment.status === "awaiting_match" || payment.status === "paid") {
    return c.json({ ok: true, status: payment.status });
  }
  const next = nextPaymentStatus(payment.status, "user_claim");
  if (!next) {
    return c.json(apiError(ERROR_CODES.conflict, "This payment cannot be marked as sent", auth.requestId), 409);
  }
  const claimed = await db
    .update(payments)
    .set({ status: next, claimedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)))
    .returning({ id: payments.id });
  if (!claimed.length) {
    return c.json({ ok: true, status: "awaiting_match" });
  }
  await audit(auth.user.id, "payment.claimed", payment.id, "user reported transfer sent", {
    reference: payment.referenceCode,
  });
  await sendAdminNotice(`Transfer to match ${payment.referenceCode}`, [
    `${auth.user.email} reports sending ${formatAmount(payment.amountMinor, payment.currency)} with reference ${payment.referenceCode}.`,
    "Check the bank statement, then confirm or reject it in Admin. No credits are granted until you confirm.",
  ]);
  return c.json({ ok: true, status: next });
});
