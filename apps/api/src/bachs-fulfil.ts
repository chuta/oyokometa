import { and, eq } from "drizzle-orm";
import {
  creditProducts,
  ensureWallet,
  getDb,
  paymentEvents,
  payments,
  purchaseCredits,
  reversePurchase,
  users,
} from "@oyokometa/db";
import { audit } from "./audit.js";
import { chargedAmountCoversPack, classifyBachsEvent, type BachsFulfilment } from "./bachs.js";
import { sendAdminNotice, sendCreditsReceipt } from "./email.js";
import { nextPaymentStatus } from "./payment-state.js";

type IncomingEvent = {
  id?: unknown;
  type?: unknown;
  data?: unknown;
};

export async function fulfilBachsEvent(event: IncomingEvent): Promise<"ok" | "retry"> {
  const eventId = typeof event.id === "string" ? event.id : "";
  if (!eventId) return "ok";
  if (await eventSeen(eventId)) return "ok";

  const decision = classifyBachsEvent(event);
  if (decision.kind === "ignore") {
    await remember(eventId, event);
    return "ok";
  }
  if (decision.kind === "grant") return grant(eventId, event, decision);
  if (decision.kind === "expire") return expire(eventId, event, decision);
  return reverse(eventId, event, decision.chargeId);
}

async function grant(
  eventId: string,
  event: IncomingEvent,
  decision: Extract<BachsFulfilment, { kind: "grant" }>,
): Promise<"ok" | "retry"> {
  const db = getDb();
  const payment = await findByReference(decision.paymentId);
  if (!payment || payment.provider !== "bachs") {
    await remember(eventId, event);
    return "ok";
  }
  if (decision.checkoutId && payment.providerRef && decision.checkoutId !== payment.providerRef) {
    console.error(JSON.stringify({ msg: "bachs_checkout_mismatch", event_id: eventId, payment_id: payment.id }));
    await remember(eventId, event);
    return "ok";
  }
  if (payment.status === "paid" || payment.status === "reversed") {
    await remember(eventId, event);
    return "ok";
  }
  const next = nextPaymentStatus(payment.status, "bachs_paid");
  if (!next) {
    await remember(eventId, event);
    return "ok";
  }
  const [product] = payment.productId
    ? await db.select().from(creditProducts).where(eq(creditProducts.id, payment.productId)).limit(1)
    : [];
  if (!product) {
    await sendAdminNotice("Bachs payment missing pack", [`Payment ${payment.id} has no credit pack.`]);
    await remember(eventId, event);
    return "ok";
  }
  const covers = chargedAmountCoversPack({
    status: decision.status,
    currency: decision.currency,
    amount: decision.amount,
    expectedUsdMinor: payment.amountMinor,
    expectedNgnMinor: product.currency === "NGN" ? product.priceMinor : null,
  });
  if (!covers) {
    await sendAdminNotice("Bachs payment amount did not match", [
      `Payment ${payment.id} was not credited.`,
      `Bachs reported ${decision.amount ?? "no amount"} ${decision.currency ?? ""} (${decision.status || "no status"}).`,
      `Expected USD ${payment.amountMinor} minor units.`,
    ]);
    await remember(eventId, event);
    return "ok";
  }

  const settled = await db
    .update(payments)
    .set({
      status: next,
      creditsGranted: product.credits,
      chargeId: decision.chargeId ?? payment.chargeId,
      providerRef: payment.providerRef ?? decision.checkoutId,
      updatedAt: new Date(),
    })
    .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)))
    .returning({ id: payments.id });
  if (!settled.length) {
    await remember(eventId, event);
    return "ok";
  }
  try {
    await purchaseCredits(payment.userId, product.credits, payment.id, "bachs");
  } catch (err) {
    await db
      .update(payments)
      .set({ status: payment.status, creditsGranted: 0, chargeId: payment.chargeId, updatedAt: new Date() })
      .where(eq(payments.id, payment.id));
    console.error(JSON.stringify({ msg: "bachs_grant_failed", payment_id: payment.id, message: (err as Error).message }));
    return "retry";
  }
  await remember(eventId, event);
  await audit("bachs", "payment.bachs.paid", payment.id, undefined, {
    event_id: eventId,
    credits: product.credits,
    charge_id: decision.chargeId,
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
  return "ok";
}

async function expire(
  eventId: string,
  event: IncomingEvent,
  decision: Extract<BachsFulfilment, { kind: "expire" }>,
): Promise<"ok" | "retry"> {
  const db = getDb();
  const payment = await findByReference(decision.paymentId);
  if (!payment || payment.provider !== "bachs") {
    await remember(eventId, event);
    return "ok";
  }
  if (decision.checkoutId && payment.providerRef && decision.checkoutId !== payment.providerRef) {
    await remember(eventId, event);
    return "ok";
  }
  const next = nextPaymentStatus(payment.status, "bachs_expire");
  if (next) {
    await db
      .update(payments)
      .set({ status: next, updatedAt: new Date() })
      .where(and(eq(payments.id, payment.id), eq(payments.status, payment.status)));
  }
  await remember(eventId, event);
  return "ok";
}

async function reverse(eventId: string, event: IncomingEvent, chargeId: string): Promise<"ok" | "retry"> {
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.chargeId, chargeId)).limit(1);
  if (!payment || payment.provider !== "bachs") {
    await sendAdminNotice("Bachs reversal did not match a payment", [`Charge ${chargeId} has no Oyokometa payment.`]);
    await remember(eventId, event);
    return "ok";
  }
  if (payment.status === "reversed") {
    await remember(eventId, event);
    return "ok";
  }
  const next = nextPaymentStatus(payment.status, "bachs_reverse");
  if (!next) {
    await remember(eventId, event);
    return "ok";
  }
  const settled = await db
    .update(payments)
    .set({ status: next, updatedAt: new Date() })
    .where(and(eq(payments.id, payment.id), eq(payments.status, "paid")))
    .returning({ id: payments.id });
  if (!settled.length) {
    await remember(eventId, event);
    return "ok";
  }
  try {
    await reversePurchase(payment.userId, payment.id, payment.creditsGranted, "bachs");
  } catch (err) {
    await db.update(payments).set({ status: "paid", updatedAt: new Date() }).where(eq(payments.id, payment.id));
    console.error(JSON.stringify({ msg: "bachs_reverse_failed", payment_id: payment.id, message: (err as Error).message }));
    return "retry";
  }
  await remember(eventId, event);
  await audit("bachs", "payment.bachs.reversed", payment.id, undefined, { event_id: eventId, charge_id: chargeId });
  await sendAdminNotice("Bachs payment reversed", [
    `Payment ${payment.id} was reversed after Bachs reported charge ${chargeId}.`,
    `${payment.creditsGranted} credits were removed.`,
  ]);
  return "ok";
}

async function findByReference(reference: string) {
  const db = getDb();
  const [payment] = await db.select().from(payments).where(eq(payments.referenceCode, reference)).limit(1);
  return payment ?? null;
}

async function eventSeen(eventId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: paymentEvents.id })
    .from(paymentEvents)
    .where(and(eq(paymentEvents.provider, "bachs"), eq(paymentEvents.providerEventId, eventId)))
    .limit(1);
  return Boolean(row);
}

async function remember(eventId: string, event: IncomingEvent) {
  const db = getDb();
  try {
    await db.insert(paymentEvents).values({
      provider: "bachs",
      providerEventId: eventId,
      payload: slimPayload(event),
      processedAt: new Date(),
    });
  } catch (err) {
    if (!isUniqueViolation(err)) throw err;
  }
}

function slimPayload(event: IncomingEvent) {
  const data = event.data && typeof event.data === "object" ? (event.data as Record<string, unknown>) : {};
  return {
    type: event.type ?? null,
    status: data.status ?? null,
    amount: data.amount ?? null,
    currency: data.currency ?? null,
    checkout_id: data.checkout_id ?? null,
    charge_id: data.charge_id ?? null,
    reference: data.reference ?? null,
  };
}

function isUniqueViolation(err: unknown): boolean {
  const current = err as { code?: string; cause?: { code?: string } };
  return current.code === "23505" || current.cause?.code === "23505";
}
