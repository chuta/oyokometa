import { and, eq, lte, sql } from "drizzle-orm";
import { getDb } from "./index.js";
import { actionPrices, creditLedger, creditWallets } from "./schema.js";

export async function ensureWallet(userId: string) {
  const db = getDb();
  const [existing] = await db.select().from(creditWallets).where(eq(creditWallets.userId, userId)).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(creditWallets).values({ userId, cachedBalance: 0 }).returning();
  return created!;
}

export async function actionCost(action: string): Promise<number> {
  const db = getDb();
  const rows = await db
    .select()
    .from(actionPrices)
    .where(and(eq(actionPrices.action, action), lte(actionPrices.effectiveFrom, new Date())))
    .orderBy(sql`${actionPrices.effectiveFrom} desc`)
    .limit(1);
  return rows[0]?.credits ?? 0;
}

async function append(
  walletId: string,
  type: string,
  amount: number,
  idempotencyKey: string,
  referenceType: string | null,
  referenceId: string | null,
  actor: string,
) {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [dup] = await tx
      .select()
      .from(creditLedger)
      .where(eq(creditLedger.idempotencyKey, idempotencyKey))
      .limit(1);
    if (dup) return dup;

    const [wallet] = await tx
      .select()
      .from(creditWallets)
      .where(eq(creditWallets.id, walletId))
      .for("update")
      .limit(1);
    if (!wallet) throw new Error("wallet missing");

    const next = wallet.cachedBalance + amount;
    if (next < 0 && type !== "REVERSAL" && type !== "HOLD") {
      throw Object.assign(new Error("insufficient_credits"), { code: "insufficient_credits" });
    }
    if (type === "HOLD" && next < 0) {
      throw Object.assign(new Error("insufficient_credits"), { code: "insufficient_credits" });
    }

    const [entry] = await tx
      .insert(creditLedger)
      .values({
        walletId,
        type,
        amount,
        balanceAfter: next,
        referenceType,
        referenceId,
        idempotencyKey,
        actor,
      })
      .returning();
    await tx
      .update(creditWallets)
      .set({ cachedBalance: next, updatedAt: new Date() })
      .where(eq(creditWallets.id, walletId));
    return entry!;
  });
}

export async function grantSignupCredits(userId: string, credits = 10) {
  const wallet = await ensureWallet(userId);
  return append(wallet.id, "SIGNUP", credits, `signup_bonus:${userId}`, "signup", userId, "system");
}

export async function purchaseCredits(userId: string, credits: number, paymentId: string, actor: string) {
  const wallet = await ensureWallet(userId);
  return append(wallet.id, "PURCHASE", credits, `purchase:${paymentId}`, "payment", paymentId, actor);
}

export async function holdCredits(
  userId: string,
  amount: number,
  referenceId: string,
  actor: string,
  referenceType = "analysis_job",
) {
  const wallet = await ensureWallet(userId);
  return append(wallet.id, "HOLD", -amount, `hold:${referenceId}`, referenceType, referenceId, actor);
}

export async function captureHold(referenceId: string, actor: string) {
  const db = getDb();
  const [hold] = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.idempotencyKey, `hold:${referenceId}`))
    .limit(1);
  if (!hold) return null;
  return append(
    hold.walletId,
    "CAPTURE",
    0,
    `capture:${referenceId}`,
    hold.referenceType ?? "analysis_job",
    referenceId,
    actor,
  );
}

export async function releaseHold(referenceId: string, actor: string) {
  const db = getDb();
  const [hold] = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.idempotencyKey, `hold:${referenceId}`))
    .limit(1);
  if (!hold) return null;
  const [already] = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.idempotencyKey, `release:${referenceId}`))
    .limit(1);
  if (already) return already;
  const [captured] = await db
    .select()
    .from(creditLedger)
    .where(eq(creditLedger.idempotencyKey, `capture:${referenceId}`))
    .limit(1);
  if (captured) return captured;
  return append(
    hold.walletId,
    "RELEASE",
    -hold.amount,
    `release:${referenceId}`,
    hold.referenceType ?? "analysis_job",
    referenceId,
    actor,
  );
}

export async function reversePurchase(userId: string, paymentId: string, credits: number, actor: string) {
  const wallet = await ensureWallet(userId);
  return append(wallet.id, "REVERSAL", -credits, `reversal:${paymentId}`, "payment", paymentId, actor);
}

export async function adjustCredits(userId: string, amount: number, reason: string, actor: string) {
  const wallet = await ensureWallet(userId);
  return append(wallet.id, "ADJUSTMENT", amount, `adj:${crypto.randomUUID()}`, "admin", reason, actor);
}

export async function reconcileWallet(walletId: string) {
  const db = getDb();
  const [sum] = await db
    .select({ total: sql<number>`coalesce(sum(${creditLedger.amount}), 0)` })
    .from(creditLedger)
    .where(eq(creditLedger.walletId, walletId));
  const [wallet] = await db.select().from(creditWallets).where(eq(creditWallets.id, walletId)).limit(1);
  const ledgerSum = Number(sum?.total ?? 0);
  const drift = (wallet?.cachedBalance ?? 0) - ledgerSum;
  return { ledgerSum, cached: wallet?.cachedBalance ?? 0, drift };
}
