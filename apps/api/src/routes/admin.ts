import { Hono } from "hono";
import { and, desc, eq, or, sql } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  getDb,
  users,
  payments,
  actionPrices,
  analysisJobs,
  shareLinks,
  creditWallets,
  creditProducts,
  ensureWallet,
  purchaseCredits,
  reversePurchase,
  adjustCredits,
  reconcileWallet,
  disputes,
  provenanceRecords,
  provenanceEvents,
} from "@oyokometa/db";
import { getSigner } from "../signing/kms.js";
import { signEvent, sha256Utf8 } from "../signing/events.js";
import { audit } from "../audit.js";
import { notFound } from "../session.js";
import { formatAmount } from "../bank.js";
import { sendCreditsReceipt, sendPaymentNotMatched } from "../email.js";
import { nextPaymentStatus } from "../payment-state.js";
import { removeOwnedThumbnail } from "../blob.js";

export const adminRoutes = new Hono();

adminRoutes.use("/admin/*", async (c, next) => {
  const auth = c.get("auth");
  if (!auth.user || !["admin", "support", "finance", "trust-and-safety"].includes(auth.user.role)) {
    return notFound(c);
  }
  await next();
});

adminRoutes.get("/admin/payments", async (c) => {
  const db = getDb();
  const rows = await db
    .select({
      id: payments.id,
      referenceCode: payments.referenceCode,
      status: payments.status,
      amountMinor: payments.amountMinor,
      currency: payments.currency,
      creditsGranted: payments.creditsGranted,
      claimedAt: payments.claimedAt,
      createdAt: payments.createdAt,
      userEmail: users.email,
      packName: creditProducts.name,
      packCredits: creditProducts.credits,
    })
    .from(payments)
    .leftJoin(users, eq(users.id, payments.userId))
    .leftJoin(creditProducts, eq(creditProducts.id, payments.productId))
    .orderBy(desc(payments.createdAt))
    .limit(100);
  return c.json({ payments: rows });
});

function canSettlePayments(role: string) {
  return role === "admin" || role === "finance";
}

adminRoutes.post("/admin/payments/:id/confirm", async (c) => {
  const auth = c.get("auth");
  if (!canSettlePayments(auth.user!.role)) return notFound(c);
  const body = await c.req.json<{ reason?: string; amount_received_minor?: number }>().catch(() => ({}) as never);
  if (!body.reason || typeof body.amount_received_minor !== "number") {
    return c.json(
      apiError(ERROR_CODES.validation_error, "Amount received and a reason are required", auth.requestId),
      400,
    );
  }
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, c.req.param("id"))).limit(1);
  if (!payment) return notFound(c);
  const next = nextPaymentStatus(payment.status, "admin_confirm");
  if (!next) {
    return c.json(apiError(ERROR_CODES.conflict, `Payment is ${payment.status}`, auth.requestId), 409);
  }
  if (body.amount_received_minor !== payment.amountMinor) {
    return c.json(
      apiError(
        ERROR_CODES.validation_error,
        `Amount received does not match the pack price (${formatAmount(payment.amountMinor, payment.currency)})`,
        auth.requestId,
      ),
      400,
    );
  }
  const [product] = payment.productId
    ? await db.select().from(creditProducts).where(eq(creditProducts.id, payment.productId)).limit(1)
    : [];
  if (!product) {
    return c.json(apiError(ERROR_CODES.validation_error, "Pack missing", auth.requestId), 400);
  }
  const settled = await db
    .update(payments)
    .set({ status: next, creditsGranted: product.credits, updatedAt: new Date() })
    .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)))
    .returning({ id: payments.id });
  if (!settled.length) {
    return c.json(apiError(ERROR_CODES.conflict, "Payment was settled by someone else", auth.requestId), 409);
  }
  try {
    await purchaseCredits(payment.userId, product.credits, payment.id, auth.user!.id);
  } catch (err) {
    await db
      .update(payments)
      .set({ status: payment.status, creditsGranted: 0, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    throw err;
  }
  await audit(auth.user!.id, "admin.payment.confirm", payment.id, body.reason, {
    reference: payment.referenceCode,
    credits: product.credits,
    amount_received_minor: body.amount_received_minor,
  });
  const wallet = await ensureWallet(payment.userId);
  const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, payment.userId)).limit(1);
  if (owner) {
    try {
      await sendCreditsReceipt({
        email: owner.email,
        credits: product.credits,
        reference: payment.referenceCode ?? payment.id,
        balance: wallet.cachedBalance,
      });
    } catch (err) {
      console.error(JSON.stringify({ msg: "receipt_email_failed", message: (err as Error).message }));
    }
  }
  return c.json({ ok: true, status: next, credits_granted: product.credits });
});

adminRoutes.post("/admin/payments/:id/reject", async (c) => {
  const auth = c.get("auth");
  if (!canSettlePayments(auth.user!.role)) return notFound(c);
  const body = await c.req.json<{ reason?: string }>().catch(() => ({}) as { reason?: string });
  if (!body.reason) {
    return c.json(apiError(ERROR_CODES.validation_error, "A reason is required", auth.requestId), 400);
  }
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, c.req.param("id"))).limit(1);
  if (!payment) return notFound(c);
  const next = nextPaymentStatus(payment.status, "admin_reject");
  if (!next) {
    return c.json(apiError(ERROR_CODES.conflict, `Payment is ${payment.status}`, auth.requestId), 409);
  }
  await db
    .update(payments)
    .set({ status: next, updatedAt: new Date() })
    .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)));
  await audit(auth.user!.id, "admin.payment.reject", payment.id, body.reason, {
    reference: payment.referenceCode,
  });
  const [owner] = await db.select({ email: users.email }).from(users).where(eq(users.id, payment.userId)).limit(1);
  if (owner) {
    try {
      await sendPaymentNotMatched({
        email: owner.email,
        reference: payment.referenceCode ?? payment.id,
        reason: body.reason,
      });
    } catch (err) {
      console.error(JSON.stringify({ msg: "reject_email_failed", message: (err as Error).message }));
    }
  }
  return c.json({ ok: true, status: next });
});

adminRoutes.post("/admin/payments/:id/reverse", async (c) => {
  const auth = c.get("auth");
  if (!canSettlePayments(auth.user!.role)) return notFound(c);
  const body = await c.req.json<{ reason?: string }>();
  if (!body.reason) {
    return c.json(apiError(ERROR_CODES.validation_error, "A reason is required", auth.requestId), 400);
  }
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.id, c.req.param("id"))).limit(1);
  if (!payment || !nextPaymentStatus(payment.status, "admin_reverse")) {
    return c.json(apiError(ERROR_CODES.conflict, "Payment is not paid", auth.requestId), 409);
  }
  await reversePurchase(payment.userId, payment.id, payment.creditsGranted, auth.user!.id);
  await db.update(payments).set({ status: "reversed", updatedAt: new Date() }).where(eq(payments.id, payment.id));
  await audit(auth.user!.id, "admin.payment.reverse", payment.id, body.reason);
  return c.json({ ok: true });
});

adminRoutes.post("/admin/credits/adjust", async (c) => {
  const auth = c.get("auth");
  if (!["admin", "finance"].includes(auth.user!.role)) return notFound(c);
  const body = await c.req.json<{ user_id?: string; amount?: number; reason?: string }>();
  if (!body.user_id || !body.reason || typeof body.amount !== "number") {
    return c.json(apiError(ERROR_CODES.validation_error, "user_id, amount and reason are required", auth.requestId), 400);
  }
  await adjustCredits(body.user_id, body.amount, body.reason, auth.user!.id);
  await audit(auth.user!.id, "admin.credit.adjust", body.user_id, body.reason, { amount: body.amount });
  return c.json({ ok: true });
});

adminRoutes.post("/admin/prices", async (c) => {
  const auth = c.get("auth");
  if (auth.user!.role !== "admin") return notFound(c);
  const body = await c.req.json<{ action?: string; credits?: number }>();
  if (!body.action || typeof body.credits !== "number") {
    return c.json(apiError(ERROR_CODES.validation_error, "action and credits required", auth.requestId), 400);
  }
  const db = getDb();
  await db.insert(actionPrices).values({ action: body.action, credits: body.credits });
  await audit(auth.user!.id, "admin.price.edit", body.action, undefined, { credits: body.credits });
  return c.json({ ok: true });
});

adminRoutes.get("/admin/lookup", async (c) => {
  const q = (c.req.query("q") ?? "").toLowerCase();
  const db = getDb();
  const foundUsers = await db
    .select({ id: users.id, email: users.email, status: users.status, role: users.role })
    .from(users)
    .where(or(eq(users.email, q), sql`${users.id}::text = ${q}`))
    .limit(10);
  return c.json({ users: foundUsers });
});

adminRoutes.get("/admin/jobs/:id", async (c) => {
  const db = getDb();
  const [job] = await db.select().from(analysisJobs).where(eq(analysisJobs.id, c.req.param("id"))).limit(1);
  if (!job) return notFound(c);
  return c.json({
    id: job.id,
    status: job.status,
    stage: job.stage,
    error_code: job.errorCode,
    tier: job.tier,
    findings_present: Boolean(job.findings),
  });
});

adminRoutes.post("/admin/share-links/:id/revoke", async (c) => {
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: "admin revoke" }));
  const db = getDb();
  await db
    .update(shareLinks)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(shareLinks.id, c.req.param("id")));
  await audit(c.get("auth").user!.id, "admin.share.revoke", c.req.param("id"), body.reason);
  return c.json({ ok: true });
});

adminRoutes.get("/admin/disputes", async (c) => {
  const db = getDb();
  const rows = await db.select().from(disputes).orderBy(desc(disputes.createdAt)).limit(100);
  return c.json({
    disputes: rows.map((d) => ({
      id: d.id,
      record_id: d.recordId,
      email: d.complainantEmail,
      reason: d.reason,
      status: d.status,
      resolution: d.resolution,
      created_at: d.createdAt,
    })),
  });
});

adminRoutes.post("/admin/disputes/:id", async (c) => {
  const auth = c.get("auth");
  if (!["admin", "trust-and-safety"].includes(auth.user!.role)) return notFound(c);
  const body = await c.req.json<{
    outcome?: "removed" | "withdrawn" | "thumbnail_removed";
    reason?: string;
  }>();
  if (!body.reason || !body.outcome) {
    return c.json(apiError(ERROR_CODES.validation_error, "outcome and reason are required", auth.requestId), 400);
  }
  const db = getDb();
  const [row] = await db.select().from(disputes).where(eq(disputes.id, c.req.param("id"))).limit(1);
  if (!row?.recordId) return notFound(c);
  const [record] = await db.select().from(provenanceRecords).where(eq(provenanceRecords.id, row.recordId)).limit(1);
  if (!record) return notFound(c);
  if (body.outcome === "removed") {
    await db
      .update(disputes)
      .set({ status: "removed", resolution: body.reason, updatedAt: new Date() })
      .where(eq(disputes.id, row.id));
    if (record.status === "disputed") {
      await db
        .update(provenanceRecords)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(provenanceRecords.id, record.id));
    }
  }
  if (body.outcome === "thumbnail_removed") {
    await removeOwnedThumbnail(record.thumbnailKey);
    await db
      .update(provenanceRecords)
      .set({ showThumbnail: false, thumbnailKey: null, updatedAt: new Date() })
      .where(eq(provenanceRecords.id, record.id));
    await db
      .update(disputes)
      .set({ status: "resolved", resolution: body.reason, updatedAt: new Date() })
      .where(eq(disputes.id, row.id));
  }
  if (body.outcome === "withdrawn") {
    const events = await db
      .select()
      .from(provenanceEvents)
      .where(eq(provenanceEvents.recordId, record.id))
      .orderBy(desc(provenanceEvents.createdAt))
      .limit(1);
    const last = events[0];
    const signer = getSigner();
    const eventId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const payload = { withdrawn_at: createdAt, admin: true };
    const signed = await signEvent(signer, {
      id: eventId,
      recordId: record.id,
      type: "WITHDRAWN",
      actor: auth.user!.id,
      payload,
      prevEventHash: last?.outputHash ?? null,
      createdAt,
      inputHash: last?.outputHash ?? sha256Utf8(record.canonicalJson),
    });
    await db.insert(provenanceEvents).values({
      id: eventId,
      recordId: record.id,
      type: "WITHDRAWN",
      actor: auth.user!.id,
      inputHash: last?.outputHash ?? sha256Utf8(record.canonicalJson),
      outputHash: signed.outputHash,
      payload,
      signature: signed.signature,
      prevEventHash: last?.outputHash ?? null,
      createdAt: new Date(createdAt),
    });
    await removeOwnedThumbnail(record.thumbnailKey);
    await db
      .update(provenanceRecords)
      .set({
        status: "withdrawn",
        showThumbnail: false,
        thumbnailKey: null,
        declarations: {},
        displayName: null,
        updatedAt: new Date(),
      })
      .where(eq(provenanceRecords.id, record.id));
    await db
      .update(disputes)
      .set({ status: "resolved", resolution: body.reason, updatedAt: new Date() })
      .where(eq(disputes.id, row.id));
  }
  await audit(auth.user!.id, "admin.dispute.resolve", row.id, body.reason, { outcome: body.outcome });
  return c.json({ ok: true });
});

adminRoutes.get("/admin/reconcile", async (c) => {
  const db = getDb();
  const wallets = await db.select().from(creditWallets);
  const results = [];
  for (const w of wallets) {
    results.push({ wallet_id: w.id, ...(await reconcileWallet(w.id)) });
  }
  const drifted = results.filter((r) => r.drift !== 0);
  if (drifted.length) console.error(JSON.stringify({ msg: "ledger_drift", drifted }));
  return c.json({ wallets: results.length, drifted });
});
