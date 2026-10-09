import { getDb, auditLog } from "@oyokometa/db";

export async function audit(actor: string, action: string, target?: string, reason?: string, metadata?: unknown) {
  const db = getDb();
  await db.insert(auditLog).values({
    actor,
    action,
    target,
    reason,
    metadata: metadata as object,
  });
}
