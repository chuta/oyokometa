import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  getDb,
  creditProducts,
  creditWallets,
  creditLedger,
  payments,
  purchaseCredits,
  ensureWallet,
  actionPrices,
} from "@oyokometa/db";
import { bankDetails, formatAmount, generateTransferReference } from "../bank.js";
import { audit } from "../audit.js";

export const creditRoutes = new Hono();

creditRoutes.get("/credits/actions", async (c) => {
  const db = getDb();
  const rows = await db.select().from(actionPrices);
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
    })),
  });
});

creditRoutes.get("/credits", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const wallet = await ensureWallet(auth.user.id);
  return c.json({ balance: wallet.cachedBalance, wallet_id: wallet.id });
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
  let reference = generateTransferReference();
  for (let i = 0; i < 5; i++) {
    const [clash] = await db.select().from(payments).where(eq(payments.referenceCode, reference)).limit(1);
    if (!clash) break;
    reference = generateTransferReference();
  }
  const [payment] = await db
    .insert(payments)
    .values({
      userId: auth.user.id,
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
  if (!payment) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create payment", auth.requestId), 503);
  }
  const bank = await bankDetails();
  await audit(auth.user.id, "payment.intent", payment.id, undefined, { reference, product: product.name });
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
    status: payment.status,
    reference: payment.referenceCode,
    credits: product?.credits ?? payment.creditsGranted,
    amount_label: formatAmount(payment.amountMinor, payment.currency),
    bank,
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
  if (payment.status === "paid") {
    const wallet = await ensureWallet(auth.user.id);
    return c.json({ ok: true, status: "paid", balance: wallet.cachedBalance, already_claimed: true });
  }
  if (payment.status !== "awaiting_transfer") {
    return c.json(apiError(ERROR_CODES.conflict, "This payment cannot be confirmed", auth.requestId), 409);
  }
  const [product] = payment.productId
    ? await db.select().from(creditProducts).where(eq(creditProducts.id, payment.productId)).limit(1)
    : [];
  if (!product) {
    return c.json(apiError(ERROR_CODES.validation_error, "Pack missing", auth.requestId), 400);
  }
  await purchaseCredits(auth.user.id, product.credits, payment.id, auth.user.id);
  await db
    .update(payments)
    .set({
      status: "paid",
      claimedAt: new Date(),
      creditsGranted: product.credits,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));
  const wallet = await ensureWallet(auth.user.id);
  await audit(auth.user.id, "payment.confirmed", payment.id, "user clicked I have paid", {
    reference: payment.referenceCode,
    credits: product.credits,
  });
  return c.json({ ok: true, status: "paid", credits_granted: product.credits, balance: wallet.cachedBalance });
});
