import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { ERROR_CODES, RULESET_VERSION, STAGES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  getDb,
  analysisJobs,
  assets,
  evidenceItems,
  rawOutputs,
  findings,
  reports,
  actionCost,
  holdCredits,
} from "@oyokometa/db";
import { allowAnonymousScan, allowEndpoint } from "../rate-limit.js";
import { enqueueAnalysis } from "../queue.js";
import { notFound } from "../session.js";
import { removeBlob } from "../blob.js";
import { audit } from "../audit.js";

const ERROR_MESSAGES = {
  unsupported_type: "This file type is not supported. Use JPEG, PNG, WebP, HEIC/HEIF or TIFF.",
  too_large: "This file exceeds the size or dimension limit.",
  corrupt: "This file could not be decoded.",
  malware_flagged: "This file was flagged by malware scanning and was not analyzed.",
  timeout: "Analysis timed out. You were not charged.",
  service_unavailable: "The service is temporarily unavailable.",
} as const satisfies Record<string, string>;

export const analysisRoutes = new Hono();

function ownerFilter(auth: { user: { id: string } | null; anon: { id: string } | null }) {
  if (auth.user) return eq(analysisJobs.ownerUserId, auth.user.id);
  if (auth.anon) return eq(analysisJobs.ownerSessionId, auth.anon.id);
  return eq(analysisJobs.id, "00000000-0000-0000-0000-000000000000");
}

analysisRoutes.post("/analyses", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`an:${auth.ipHash}`, 20)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  const signedIn = Boolean(auth.user);
  if (!allowAnonymousScan(auth.user?.id ?? auth.anon?.id ?? "x", auth.ipHash, signedIn)) {
    return c.json(
      apiError(ERROR_CODES.rate_limited, "Daily scan allowance reached", auth.requestId),
      429,
    );
  }
  const idem = c.req.header("Idempotency-Key") ?? crypto.randomUUID();
  const body = await c.req.json<{ asset_id: string; tier?: string }>();
  const tier = body.tier === "deep" ? "deep" : "quick";
  if (tier === "deep" && !auth.user) {
    return c.json(
      apiError(ERROR_CODES.unauthorized, "Sign in required for Deep Analysis", auth.requestId),
      401,
    );
  }
  const db = getDb();
  const [existing] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.idempotencyKey, idem), ownerFilter(auth)))
    .limit(1);
  if (existing) {
    return c.json({ id: existing.id, status: existing.status, stage: existing.stage }, 200);
  }

  const [asset] = await db.select().from(assets).where(eq(assets.id, body.asset_id)).limit(1);
  const owns =
    asset &&
    ((auth.user && asset.ownerUserId === auth.user.id) ||
      (!auth.user && asset.ownerSessionId === auth.anon?.id));
  if (!asset || !owns || asset.imageDeletedAt) return notFound(c);

  if (asset.sha256 && auth.user) {
    const cached = await db
      .select()
      .from(analysisJobs)
      .where(
        and(
          eq(analysisJobs.ownerUserId, auth.user.id),
          eq(analysisJobs.tier, tier),
          eq(analysisJobs.rulesetVersion, RULESET_VERSION),
          eq(analysisJobs.status, "completed"),
          isNull(analysisJobs.deletedAt),
        ),
      )
      .limit(50);
    for (const row of cached) {
      const [prevAsset] = await db.select().from(assets).where(eq(assets.id, row.assetId)).limit(1);
      if (prevAsset?.sha256 === asset.sha256) {
        return c.json({ id: row.id, status: row.status, stage: row.stage, reused: true }, 200);
      }
    }
  }

  if (tier === "deep" && !auth.user?.emailVerified) {
    return c.json(
      apiError(ERROR_CODES.email_unverified, "Verify your email for Deep Analysis", auth.requestId),
      403,
    );
  }

  const [job] = await db
    .insert(analysisJobs)
    .values({
      assetId: asset.id,
      ownerUserId: auth.user?.id ?? null,
      ownerSessionId: auth.user ? null : auth.anon?.id ?? null,
      tier,
      status: "queued",
      stage: STAGES[0],
      idempotencyKey: idem,
      rulesetVersion: RULESET_VERSION,
    })
    .returning();
  if (!job) {
    return c.json(apiError(ERROR_CODES.service_unavailable, ERROR_MESSAGES.service_unavailable, auth.requestId), 503);
  }
  if (tier === "deep" && auth.user) {
    const cost = await actionCost("deep_analysis");
    try {
      const hold = await holdCredits(auth.user.id, cost, job.id, auth.user.id);
      await db.update(analysisJobs).set({ creditHoldId: hold.id }).where(eq(analysisJobs.id, job.id));
    } catch (err) {
      await db
        .update(analysisJobs)
        .set({ status: "failed", errorCode: "insufficient_credits", errorMessage: "Not enough credits" })
        .where(eq(analysisJobs.id, job.id));
      if ((err as { code?: string }).code === "insufficient_credits") {
        return c.json(apiError(ERROR_CODES.insufficient_credits, "Not enough credits for Deep Analysis", auth.requestId), 402);
      }
      throw err;
    }
  }
  await enqueueAnalysis(job.id);
  await audit(auth.user?.id ?? auth.anon?.id ?? "anon", "analysis.create", job.id);
  return c.json({ id: job.id, status: job.status, stage: job.stage }, 201);
});

analysisRoutes.get("/analyses/:id", async (c) => {
  const auth = c.get("auth");
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  const [asset] = await db.select().from(assets).where(eq(assets.id, job.assetId)).limit(1);
  const payload: Record<string, unknown> = {
    id: job.id,
    status: job.status,
    stage: job.stage,
    tier: job.tier,
    error_code: job.errorCode,
    error_message: job.errorCode
      ? ERROR_MESSAGES[job.errorCode as keyof typeof ERROR_MESSAGES] ?? job.errorMessage
      : null,
    findings: job.findings,
    preview_url: asset?.previewKey ? `/api/v1/previews/${asset.id}` : null,
    created_at: job.createdAt,
    completed_at: job.completedAt,
  };
  return c.json(payload);
});

analysisRoutes.get("/analyses/:id/evidence", async (c) => {
  const auth = c.get("auth");
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  if (job.tier !== "deep") {
    return c.json(apiError(ERROR_CODES.unauthorized, "Deep Analysis required", auth.requestId), 403);
  }
  const rows = await db.select().from(evidenceItems).where(eq(evidenceItems.jobId, job.id));
  return c.json({ evidence: rows });
});

analysisRoutes.get("/analyses/:id/metadata", async (c) => {
  const auth = c.get("auth");
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  if (job.tier !== "deep") {
    return c.json(apiError(ERROR_CODES.unauthorized, "Deep Analysis required", auth.requestId), 403);
  }
  const rows = await db.select().from(rawOutputs).where(eq(rawOutputs.jobId, job.id));
  const stripped = rows.map((r) => {
    const payload = { ...(r.payload as Record<string, unknown> | null) };
    if (payload) {
      for (const k of Object.keys(payload)) {
        if (/gps|latitude|longitude/i.test(k)) delete payload[k];
      }
    }
    return { producer: r.producer, payload };
  });
  return c.json({ raw: stripped });
});

analysisRoutes.post("/analyses/:id/gps", async (c) => {
  const auth = c.get("auth");
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  await audit(auth.user?.id ?? auth.anon?.id ?? "anon", "gps.reveal", job.id, "explicit click");
  const rows = await db.select().from(rawOutputs).where(eq(rawOutputs.jobId, job.id));
  let lat: number | null = null;
  let lng: number | null = null;
  for (const r of rows) {
    const p = r.payload as Record<string, unknown> | null;
    if (!p) continue;
    const la = Number(p["EXIF:GPSLatitude"] ?? p.GPSLatitude ?? p.latitude);
    const ln = Number(p["EXIF:GPSLongitude"] ?? p.GPSLongitude ?? p.longitude);
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      lat = la;
      lng = ln;
    }
  }
  return c.json({
    warning: "Location metadata can be edited or removed and is not proof of where the image was taken.",
    gps: lat != null && lng != null ? { lat, lng } : null,
  });
});

analysisRoutes.delete("/analyses/:id", async (c) => {
  const auth = c.get("auth");
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  const [asset] = await db.select().from(assets).where(eq(assets.id, job.assetId)).limit(1);
  if (asset?.storageKey) await removeBlob(asset.storageKey);
  if (asset?.previewKey) await removeBlob(asset.previewKey);
  await db.delete(findings).where(eq(findings.jobId, job.id));
  await db.delete(evidenceItems).where(eq(evidenceItems.jobId, job.id));
  await db.delete(rawOutputs).where(eq(rawOutputs.jobId, job.id));
  await db.delete(reports).where(eq(reports.jobId, job.id));
  await db
    .update(analysisJobs)
    .set({ deletedAt: new Date(), findings: null, updatedAt: new Date() })
    .where(eq(analysisJobs.id, job.id));
  if (asset) {
    await db
      .update(assets)
      .set({ imageDeletedAt: new Date(), sha256: asset.sha256, updatedAt: new Date() })
      .where(eq(assets.id, asset.id));
  }
  await audit(auth.user?.id ?? auth.anon?.id ?? "anon", "analysis.delete", job.id, "user delete now");
  return c.json({ ok: true });
});

analysisRoutes.post("/analyses/:id/upgrade", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.id, c.req.param("id")), isNull(analysisJobs.deletedAt), ownerFilter(auth)))
    .limit(1);
  if (!job) return notFound(c);
  const idem = c.req.header("Idempotency-Key") ?? `upgrade:${job.id}`;
  const res = await db
    .insert(analysisJobs)
    .values({
      assetId: job.assetId,
      ownerUserId: auth.user.id,
      tier: "deep",
      status: "queued",
      stage: STAGES[0],
      idempotencyKey: idem,
      rulesetVersion: RULESET_VERSION,
    })
    .returning();
  const deep = res[0];
  if (!deep) {
    return c.json(apiError(ERROR_CODES.service_unavailable, ERROR_MESSAGES.service_unavailable, auth.requestId), 503);
  }
  const cost = await actionCost("deep_analysis");
  try {
    const hold = await holdCredits(auth.user.id, cost, deep.id, auth.user.id);
    await db.update(analysisJobs).set({ creditHoldId: hold.id }).where(eq(analysisJobs.id, deep.id));
  } catch (err) {
    if ((err as { code?: string }).code === "insufficient_credits") {
      return c.json(apiError(ERROR_CODES.insufficient_credits, "Not enough credits", auth.requestId), 402);
    }
    throw err;
  }
  await enqueueAnalysis(deep.id);
  return c.json({ id: deep.id, status: deep.status, stage: deep.stage }, 201);
});
