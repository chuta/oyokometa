import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { ERROR_CODES, LIMITS } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import type { FindingsObject } from "@oyokometa/evidence";
import { getDb, analysisJobs, shareLinks, assets } from "@oyokometa/db";
import { notFound } from "../session.js";
import { randomToken } from "../crypto.js";
import { audit } from "../audit.js";
import { readBlob, useFs } from "../blob.js";

export const shareRoutes = new Hono();

function ownerFilter(auth: { user: { id: string } | null }) {
  if (auth.user) return eq(analysisJobs.ownerUserId, auth.user.id);
  return eq(analysisJobs.id, "00000000-0000-0000-0000-000000000000");
}

shareRoutes.post("/analyses/:id/share-links", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (!auth.user.emailVerified) {
    return c.json(apiError(ERROR_CODES.email_unverified, "Verify your email to create a share link", auth.requestId), 403);
  }
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job || job.status !== "completed") return notFound(c);
  const body = await c.req.json().catch(() => ({ include_image: false }));
  const publicId = randomToken(16);
  const expires = new Date(Date.now() + LIMITS.shareLinkDefaultDays * 86400_000);
  const [link] = await db
    .insert(shareLinks)
    .values({
      jobId: job.id,
      publicId,
      includeImage: Boolean(body.include_image),
      expiresAt: expires,
    })
    .returning();
  await audit(auth.user.id, "share.create", job.id);
  return c.json({ id: link!.id, public_id: publicId, expires_at: expires, url: `/s/${publicId}` }, 201);
});

shareRoutes.delete("/share-links/:id", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [link] = await db.select().from(shareLinks).where(eq(shareLinks.id, c.req.param("id"))).limit(1);
  if (!link) return notFound(c);
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, link.jobId), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  await db.update(shareLinks).set({ revokedAt: new Date(), updatedAt: new Date() }).where(eq(shareLinks.id, link.id));
  await audit(auth.user.id, "share.revoke", link.id);
  return c.json({ ok: true });
});

shareRoutes.get("/share/:public_id", async (c) => {
  const db = getDb();
  const [link] = await db.select().from(shareLinks).where(eq(shareLinks.publicId, c.req.param("public_id"))).limit(1);
  if (!link || link.revokedAt || link.expiresAt < new Date()) return notFound(c);
  const [job] = await db.select().from(analysisJobs).where(eq(analysisJobs.id, link.jobId)).limit(1);
  if (!job?.findings || job.deletedAt) return notFound(c);
  const findings = job.findings as FindingsObject;
  const publicFindings = {
    ...findings,
    identity: { ...findings.identity, file_name: null },
    gps: null,
    gps_revealed: false,
  };
  const [asset] = await db.select().from(assets).where(eq(assets.id, job.assetId)).limit(1);
  return c.json({
    findings: publicFindings,
    include_image: link.includeImage,
    preview_available: Boolean(link.includeImage && asset?.previewKey),
    acquisition_time_utc: findings.acquisition_time_utc,
    banner: "analysis of the file as submitted",
  });
});

shareRoutes.get("/share/:public_id/preview", async (c) => {
  const db = getDb();
  const [link] = await db.select().from(shareLinks).where(eq(shareLinks.publicId, c.req.param("public_id"))).limit(1);
  if (!link || !link.includeImage || link.revokedAt || link.expiresAt < new Date()) return notFound(c);
  const [job] = await db.select().from(analysisJobs).where(eq(analysisJobs.id, link.jobId)).limit(1);
  if (!job) return notFound(c);
  const [asset] = await db.select().from(assets).where(eq(assets.id, job.assetId)).limit(1);
  if (!asset?.previewKey || !useFs()) return notFound(c);
  const buf = await readBlob(asset.previewKey);
  return new Response(buf, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=60",
    },
  });
});
