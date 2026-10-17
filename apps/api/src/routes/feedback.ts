import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { and, eq, gte } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import { feedbackMessages, getDb } from "@oyokometa/db";
import { allowEndpoint } from "../rate-limit.js";
import { parseFeedback } from "../feedback.js";
import { sendAdminNotice, sendFeedbackReceipt } from "../email.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function referenceCode() {
  const bytes = randomBytes(8);
  let out = "OKM-F";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const feedbackRoutes = new Hono();

feedbackRoutes.post("/feedback", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`fb:${auth.ipHash}`, 5, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many messages. Try again later.", auth.requestId), 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter your message.", auth.requestId), 400);
  }
  const parsed = parseFeedback(body);
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);

  const db = getDb();
  const note = parsed.value;
  const [existingKey] = await db
    .select({ referenceCode: feedbackMessages.referenceCode })
    .from(feedbackMessages)
    .where(eq(feedbackMessages.idempotencyKey, note.idempotencyKey))
    .limit(1);
  if (existingKey) return c.json({ reference: existingKey.referenceCode, email_sent: false, duplicate: true });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [sameNote] = await db
    .select({ referenceCode: feedbackMessages.referenceCode })
    .from(feedbackMessages)
    .where(and(eq(feedbackMessages.email, note.email), eq(feedbackMessages.message, note.message), gte(feedbackMessages.createdAt, since)))
    .limit(1);
  if (sameNote) return c.json({ reference: sameNote.referenceCode, email_sent: false, duplicate: true });

  const reference = referenceCode();
  const [row] = await db
    .insert(feedbackMessages)
    .values({
      referenceCode: reference,
      idempotencyKey: note.idempotencyKey,
      name: note.name,
      email: note.email,
      message: note.message,
    })
    .returning({ referenceCode: feedbackMessages.referenceCode });

  console.log(JSON.stringify({ msg: "feedback_message" }));

  let emailSent = false;
  try {
    emailSent = await sendFeedbackReceipt({ email: note.email, reference: row?.referenceCode ?? reference });
  } catch (err) {
    console.error(JSON.stringify({ msg: "feedback_receipt_failed", message: (err as Error).message }));
  }
  await sendAdminNotice(`Feedback ${reference}`, [
    `${note.name} (${note.email}).`,
    note.message,
    `Reference ${reference}.`,
  ]);

  return c.json({ reference: row?.referenceCode ?? reference, email_sent: emailSent, duplicate: false }, 201);
});
