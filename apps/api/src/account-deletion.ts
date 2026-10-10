import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import {
  getDb,
  analysisJobs,
  assets,
  auditLog,
  magicLinks,
  provenanceEvents,
  provenanceRecords,
  sessions,
  users,
} from "@oyokometa/db";
import { audit } from "./audit.js";
import { removeOwnedThumbnail } from "./blob.js";
import { purgeAssetBytes, purgeJob } from "./purge.js";
import { signEvent, sha256Utf8 } from "./signing/events.js";
import { getSigner } from "./signing/kms.js";

export const DELETION_CONFIRM_WORD = "DELETE";

export function erasedEmail(userId: string) {
  return `deleted+${userId}@deleted.invalid`;
}

/** Public records are withdrawn with a signed event, not erased, so verifiers see why they stopped resolving. */
async function withdrawRecord(row: typeof provenanceRecords.$inferSelect) {
  const db = getDb();
  const events = await db
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.recordId, row.id))
    .orderBy(asc(provenanceEvents.createdAt));
  const last = events[events.length - 1];
  const signer = getSigner();
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const payload = { withdrawn_at: createdAt, reason: "account_deleted" };
  const inputHash = last?.outputHash ?? sha256Utf8(row.canonicalJson);
  const signed = await signEvent(signer, {
    id: eventId,
    recordId: row.id,
    type: "WITHDRAWN",
    actor: "system:account-deletion",
    payload,
    prevEventHash: last?.outputHash ?? null,
    createdAt,
    inputHash,
  });
  await db.insert(provenanceEvents).values({
    id: eventId,
    recordId: row.id,
    type: "WITHDRAWN",
    actor: "system:account-deletion",
    inputHash,
    outputHash: signed.outputHash,
    payload,
    signature: signed.signature,
    prevEventHash: last?.outputHash ?? null,
    createdAt: new Date(createdAt),
  });
  await removeOwnedThumbnail(row.thumbnailKey);
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
    .where(eq(provenanceRecords.id, row.id));
}

/**
 * Erases a user's content and personal data. Ledger and payment rows stay for accounting but
 * point at an anonymised user; audit rows naming the email are redacted.
 */
export async function eraseAccount(userId: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user || user.deletedAt) return null;

  const jobs = await db
    .select({ id: analysisJobs.id })
    .from(analysisJobs)
    .where(and(eq(analysisJobs.ownerUserId, userId), isNull(analysisJobs.deletedAt)));
  for (const job of jobs) await purgeJob(job.id);

  const owned = await db
    .select()
    .from(assets)
    .where(and(eq(assets.ownerUserId, userId), isNull(assets.imageDeletedAt)));
  for (const asset of owned) await purgeAssetBytes(asset);
  await db.update(assets).set({ declaredFilename: null, updatedAt: new Date() }).where(eq(assets.ownerUserId, userId));

  const records = await db
    .select()
    .from(provenanceRecords)
    .where(and(eq(provenanceRecords.ownerUserId, userId), ne(provenanceRecords.status, "withdrawn")));
  for (const row of records) await withdrawRecord(row);

  await db
    .update(sessions)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
  await db.delete(magicLinks).where(eq(magicLinks.email, user.email));

  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('oyokometa.audit_redaction', 'on', true)`);
    await tx.update(auditLog).set({ target: "[redacted]" }).where(eq(auditLog.target, user.email));
  });

  await db
    .update(users)
    .set({
      email: erasedEmail(userId),
      username: null,
      passwordHash: null,
      displayName: null,
      googleId: null,
      emailVerifiedAt: null,
      status: "deleted",
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const result = { analyses: jobs.length, images: owned.length, records_withdrawn: records.length };
  await audit("system:account-deletion", "account.deleted", userId, "self-service deletion", result);
  return result;
}
