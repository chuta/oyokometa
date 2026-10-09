import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import { getDb, disputes, provenanceRecords, provenanceEvents } from "@oyokometa/db";
import { allowEndpoint } from "../rate-limit.js";
import { audit } from "../audit.js";
import { notFound } from "../session.js";
import { randomToken, sha256Hex } from "../crypto.js";
import { getSigner } from "../signing/kms.js";
import { signEvent, sha256Utf8 } from "../signing/events.js";
import { EmailDeliveryError, sendDisputeLink } from "../email.js";
import { publicAppOrigin } from "../origin.js";

export const disputeRoutes = new Hono();

disputeRoutes.post("/disputes", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`dp:${auth.ipHash}`, 8, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  const body = await c.req.json<{ public_id?: string; email?: string; reason?: string }>();
  const email = body.email?.trim().toLowerCase();
  const reason = body.reason?.trim() ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter a valid email", auth.requestId), 400);
  }
  if (reason.length < 20) {
    return c.json(
      apiError(ERROR_CODES.validation_error, "Describe the complaint in at least 20 characters", auth.requestId),
      400,
    );
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(provenanceRecords)
    .where(eq(provenanceRecords.publicId, body.public_id ?? ""))
    .limit(1);
  if (!row || row.visibility !== "public") return notFound(c);
  const raw = randomToken(32);
  const [created] = await db
    .insert(disputes)
    .values({
      recordId: row.id,
      complainantEmail: email,
      reason,
      status: "pending_email",
      tokenHash: sha256Hex(raw),
    })
    .returning();
  const url = `${publicAppOrigin()}/disputes/confirm?token=${raw}`;
  try {
    const sent = await sendDisputeLink(email, url);
    await audit("public", "dispute.filed", created?.id, undefined, { public_id: row.publicId });
    return c.json({
      ok: true,
      dev_link: sent.sent || process.env.NODE_ENV === "production" ? undefined : sent.url,
    });
  } catch (err) {
    if (err instanceof EmailDeliveryError) {
      return c.json(apiError(ERROR_CODES.service_unavailable, "Could not send the confirmation email", auth.requestId), 503);
    }
    throw err;
  }
});

disputeRoutes.post("/disputes/confirm", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json<{ token?: string }>();
  if (!body.token) {
    return c.json(apiError(ERROR_CODES.validation_error, "Missing token", auth.requestId), 400);
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(disputes)
    .where(eq(disputes.tokenHash, sha256Hex(body.token)))
    .limit(1);
  if (!row || row.status !== "pending_email") {
    return c.json(apiError(ERROR_CODES.unauthorized, "This confirmation link is invalid", auth.requestId), 401);
  }
  const faciallyValid = row.reason.trim().length >= 40;
  await db
    .update(disputes)
    .set({
      status: faciallyValid ? "open" : "needs_review",
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(disputes.id, row.id));
  if (faciallyValid && row.recordId) {
    const [record] = await db
      .select()
      .from(provenanceRecords)
      .where(eq(provenanceRecords.id, row.recordId))
      .limit(1);
    if (record && record.status === "active") {
      await markDisputed(record.id, `dispute:${row.id}`);
    }
  }
  await audit(row.complainantEmail, "dispute.email_verified", row.id);
  return c.json({
    ok: true,
    status: faciallyValid ? "open" : "needs_review",
    message: faciallyValid
      ? "The record is marked disputed pending review."
      : "Your complaint was received and will be reviewed.",
  });
});

export async function markDisputed(recordId: string, actor: string) {
  const db = getDb();
  const [record] = await db.select().from(provenanceRecords).where(eq(provenanceRecords.id, recordId)).limit(1);
  if (!record || record.status === "withdrawn") return;
  const events = await db
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.recordId, recordId))
    .orderBy(desc(provenanceEvents.createdAt))
    .limit(1);
  const last = events[0];
  const signer = getSigner();
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const payload = { status: "disputed" };
  const signed = await signEvent(signer, {
    id: eventId,
    recordId,
    type: "DISPUTED",
    actor,
    payload,
    prevEventHash: last?.outputHash ?? null,
    createdAt,
    inputHash: last?.outputHash ?? sha256Utf8(record.canonicalJson),
  });
  await db.insert(provenanceEvents).values({
    id: eventId,
    recordId,
    type: "DISPUTED",
    actor,
    inputHash: last?.outputHash ?? sha256Utf8(record.canonicalJson),
    outputHash: signed.outputHash,
    payload,
    signature: signed.signature,
    prevEventHash: last?.outputHash ?? null,
    createdAt: new Date(createdAt),
  });
  await db
    .update(provenanceRecords)
    .set({ status: "disputed", updatedAt: new Date() })
    .where(eq(provenanceRecords.id, recordId));
}
