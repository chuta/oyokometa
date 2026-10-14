import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { and, eq, gte } from "drizzle-orm";
import { ERROR_CODES, solutionTitle } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import { clientRequests, getDb } from "@oyokometa/db";
import { allowEndpoint } from "../rate-limit.js";
import { parseSolutionIntake } from "../solution-intake.js";
import { sendAdminNotice, sendSolutionReceipt } from "../email.js";
import { publicAppOrigin } from "../origin.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function referenceCode() {
  const bytes = randomBytes(8);
  let out = "OKM-S";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const solutionRoutes = new Hono();

solutionRoutes.post("/solutions", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`sol:${auth.ipHash}`, 5, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests. Try again later.", auth.requestId), 429);
  }
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter the request details.", auth.requestId), 400);
  }
  const parsed = parseSolutionIntake(body);
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);

  const db = getDb();
  const intake = parsed.value;
  const [existingKey] = await db
    .select({ referenceCode: clientRequests.referenceCode })
    .from(clientRequests)
    .where(eq(clientRequests.idempotencyKey, intake.idempotencyKey))
    .limit(1);
  if (existingKey) return c.json({ reference: existingKey.referenceCode, email_sent: false, duplicate: true });

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [sameProblem] = await db
    .select({ referenceCode: clientRequests.referenceCode })
    .from(clientRequests)
    .where(and(eq(clientRequests.email, intake.email), eq(clientRequests.problem, intake.problem), gte(clientRequests.createdAt, since)))
    .limit(1);
  if (sameProblem) return c.json({ reference: sameProblem.referenceCode, email_sent: false, duplicate: true });

  const reference = referenceCode();
  const [row] = await db
    .insert(clientRequests)
    .values({
      referenceCode: reference,
      idempotencyKey: intake.idempotencyKey,
      contactName: intake.contactName,
      email: intake.email,
      organizationName: intake.organizationName,
      jobTitle: intake.jobTitle,
      country: intake.country,
      contactMethod: intake.contactMethod,
      phone: intake.phone,
      website: intake.website,
      profileUrl: intake.profileUrl,
      preferredTime: intake.preferredTime,
      organizationType: intake.organizationType,
      organizationContext: intake.organizationContext,
      services: intake.services,
      needs: intake.needs,
      problem: intake.problem,
      mediaTypes: intake.mediaTypes,
      mediaSources: intake.mediaSources,
      volume: intake.volume,
      engagement: intake.engagement,
      budgetRange: intake.budgetRange,
      currency: intake.currency,
      expectedStart: intake.expectedStart,
      decisionStatus: intake.decisionStatus,
      details: intake.details,
      privacyAck: true,
      marketingConsent: intake.marketingConsent,
      contactConsent: intake.contactConsent,
    })
    .returning({ referenceCode: clientRequests.referenceCode });

  console.log(
    JSON.stringify({
      msg: "solution_request",
      services: intake.services,
      organization_type: intake.organizationType,
      engagement: intake.engagement,
    }),
  );

  let emailSent = false;
  try {
    emailSent = await sendSolutionReceipt({ email: intake.email, reference: row?.referenceCode ?? reference });
  } catch (err) {
    console.error(JSON.stringify({ msg: "solution_receipt_failed", message: (err as Error).message }));
  }
  const origin = publicAppOrigin();
  await sendAdminNotice(`New solution request ${reference}`, [
    `${intake.contactName}, ${intake.organizationName} (${intake.country}).`,
    `Services: ${intake.services.map(solutionTitle).join(", ")}.`,
    `Open the secured record in Admin. Reference ${reference}.`,
    `${origin}/admin`,
  ]);

  return c.json({ reference: row?.referenceCode ?? reference, email_sent: emailSent, duplicate: false }, 201);
});
