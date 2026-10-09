import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import type { FindingsObject } from "@oyokometa/evidence";
import {
  getDb,
  analysisJobs,
  reports,
  actionCost,
  holdCredits,
  captureHold,
  releaseHold,
} from "@oyokometa/db";
import { notFound } from "../session.js";
import { writeBlob, readBlob } from "../blob.js";
import { hashBuffer, jsonReportBytes, pdfReportBytes, reportPayload } from "../report-builder.js";
import { sendReportLink } from "../email.js";
import { audit } from "../audit.js";

export const reportRoutes = new Hono();

function ownerFilter(auth: { user: { id: string } | null; anon: { id: string } | null }) {
  if (auth.user) return eq(analysisJobs.ownerUserId, auth.user.id);
  if (auth.anon) return eq(analysisJobs.ownerSessionId, auth.anon.id);
  return eq(analysisJobs.id, "00000000-0000-0000-0000-000000000000");
}

reportRoutes.post("/analyses/:id/reports", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (!auth.user.emailVerified) {
    return c.json(apiError(ERROR_CODES.email_unverified, "Verify your email to generate a report", auth.requestId), 403);
  }
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job || job.status !== "completed" || !job.findings) return notFound(c);
  if (job.tier !== "deep") {
    return c.json(
      apiError(ERROR_CODES.validation_error, "Reports require Deep Analysis", auth.requestId),
      400,
    );
  }
  const body = await c.req.json().catch(() => ({ include_gps: false, email: false }));
  const includeGps = Boolean(body.include_gps);
  const cost = await actionCost("report");
  const holdId = crypto.randomUUID();
  try {
    await holdCredits(auth.user.id, cost, `report:${holdId}`, auth.user.id);
  } catch (err) {
    if ((err as { code?: string }).code === "insufficient_credits") {
      return c.json(apiError(ERROR_CODES.insufficient_credits, "Not enough credits", auth.requestId), 402);
    }
    throw err;
  }

  const findings = job.findings as FindingsObject;
  const created: { id: string; format: string; report_hash: string }[] = [];
  try {
    for (const format of ["json", "pdf"] as const) {
      const id = crypto.randomUUID();
      const payload = reportPayload(findings, id, includeGps);
      const bytes = format === "json" ? jsonReportBytes(payload) : pdfReportBytes(payload);
      const hash = hashBuffer(bytes);
      const key = `reports/${id}.${format}`;
      await writeBlob(key, bytes, format === "json" ? "application/json" : "application/pdf");
      await db.insert(reports).values({
        id,
        jobId: job.id,
        format,
        reportHash: hash,
        storageKey: key,
        includeGps,
      });
      created.push({ id, format, report_hash: hash });
    }
    await captureHold(`report:${holdId}`, auth.user.id);
  } catch (err) {
    await releaseHold(`report:${holdId}`, "system");
    throw err;
  }
  if (body.email) {
    const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
    await sendReportLink(auth.user.email, `${origin}/account/reports`);
  }
  await audit(auth.user.id, "report.create", job.id);
  return c.json({ reports: created }, 201);
});

reportRoutes.get("/reports/:id", async (c) => {
  const auth = c.get("auth");
  const db = getDb();
  const [row] = await db.select().from(reports).where(eq(reports.id, c.req.param("id"))).limit(1);
  if (!row) return notFound(c);
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, row.jobId), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  const buf = await readBlob(row.storageKey);
  const type = row.format === "pdf" ? "application/pdf" : "application/json";
  return new Response(buf, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="oyokometa-report.${row.format}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
});

reportRoutes.post("/reports/check", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json<{ sha256?: string }>();
  const hash = body.sha256?.toLowerCase();
  if (!hash || !/^[a-f0-9]{64}$/.test(hash)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Provide a SHA-256 hex digest", auth.requestId), 400);
  }
  const db = getDb();
  const [row] = await db.select().from(reports).where(eq(reports.reportHash, hash)).limit(1);
  return c.json({
    matches: Boolean(row),
    report_id: row?.id ?? null,
    format: row?.format ?? null,
  });
});
