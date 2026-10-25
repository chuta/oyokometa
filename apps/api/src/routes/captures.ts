import { Hono } from "hono";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ERROR_CODES, LIMITS } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  actionCost,
  captureHold,
  captureRequests,
  captureSessions,
  civicCases,
  ensureWallet,
  getDb,
  holdCredits,
  provenanceRecords,
  releaseHold,
} from "@oyokometa/db";
import { acceptCaptureFrame } from "../capture-accept.js";
import {
  CAPTURE_ACTION,
  NONCE_TTL_MS,
  captureReferenceCode,
  nonceMatches,
  parseCaptureCreate,
  parseDeviceReport,
  parseGps,
  requestCanAcceptFrame,
} from "../capture.js";
import { markCaptureCancelled, markCaptureExpired } from "../civic-capture.js";
import { civicCaptureNotice } from "../civic.js";
import { randomToken, sha256Hex } from "../crypto.js";
import { publicAppOrigin } from "../origin.js";
import { priceChangedResponse, priceConfirmed } from "../price-check.js";
import { allowEndpoint } from "../rate-limit.js";
import { notFound } from "../session.js";
import { audit } from "../audit.js";

function linkFor(token: string) {
  return `${publicAppOrigin()}/c/${token}`;
}

type RequestRow = typeof captureRequests.$inferSelect;

async function expireIfNeeded(row: RequestRow) {
  if ((row.status !== "open" && row.status !== "capturing") || row.expiresAt > new Date()) return row;
  await releaseHold(row.id, "system:capture-expiry");
  const updated = await markCaptureExpired(row.id);
  return updated ?? { ...row, status: "expired" };
}

async function byToken(token: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(captureRequests)
    .where(eq(captureRequests.tokenHash, sha256Hex(token)))
    .limit(1);
  if (!row) return null;
  return expireIfNeeded(row);
}

function publicState(row: RequestRow) {
  const open = row.status === "open" || row.status === "capturing";
  return {
    reference: row.referenceCode,
    prompt: open ? row.prompt : null,
    address: open ? row.address : null,
    status: row.status,
    expires_at: row.expiresAt,
    civic: Boolean(row.caseId),
    notice: row.caseId && open ? civicCaptureNotice(row.prompt) : null,
  };
}

async function ownerPayload(row: RequestRow) {
  const db = getDb();
  let recordPublicId: string | null = null;
  if (row.provenanceRecordId) {
    const [record] = await db
      .select({ publicId: provenanceRecords.publicId })
      .from(provenanceRecords)
      .where(eq(provenanceRecords.id, row.provenanceRecordId))
      .limit(1);
    recordPublicId = record?.publicId ?? null;
  }
  if (row.status === "completed") await captureHold(row.id, row.ownerUserId);
  let caseReference: string | null = null;
  if (row.caseId) {
    const [civic] = await db
      .select({ reference: civicCases.publicReference })
      .from(civicCases)
      .where(eq(civicCases.id, row.caseId))
      .limit(1);
    caseReference = civic?.reference ?? null;
  }
  return {
    id: row.id,
    reference: row.referenceCode,
    prompt: row.prompt,
    address: row.address,
    status: row.status,
    expires_at: row.expiresAt,
    created_at: row.createdAt,
    record_public_id: recordPublicId,
    case_linked: Boolean(row.caseId),
    case_reference: caseReference,
  };
}

export const captureRoutes = new Hono();

captureRoutes.post("/captures", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  if (!allowEndpoint(`cap:${auth.user.id}`, 20, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many capture links. Try again later.", auth.requestId), 429);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = parseCaptureCreate(body);
  if (!parsed.ok) return c.json(apiError(ERROR_CODES.validation_error, parsed.message, auth.requestId), 400);

  const db = getDb();
  const [existing] = await db
    .select()
    .from(captureRequests)
    .where(and(eq(captureRequests.idempotencyKey, parsed.value.idempotencyKey), eq(captureRequests.ownerUserId, auth.user.id)))
    .limit(1);
  if (existing) {
    return c.json({ ...(await ownerPayload(existing)), duplicate: true, link: null });
  }

  const cost = await actionCost(CAPTURE_ACTION);
  if (!priceConfirmed(parsed.value.expectedCredits, cost)) {
    return priceChangedResponse(c, cost, auth.requestId);
  }

  const token = randomToken(32);
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + parsed.value.expiresInHours * 3_600_000);
  try {
    await db.insert(captureRequests).values({
      id,
      ownerUserId: auth.user.id,
      referenceCode: captureReferenceCode(),
      idempotencyKey: parsed.value.idempotencyKey,
      tokenHash: sha256Hex(token),
      prompt: parsed.value.prompt,
      address: parsed.value.address,
      status: "open",
      expiresAt,
    });
  } catch {
    const [again] = await db
      .select()
      .from(captureRequests)
      .where(eq(captureRequests.idempotencyKey, parsed.value.idempotencyKey))
      .limit(1);
    if (again && again.ownerUserId === auth.user.id) {
      return c.json({ ...(await ownerPayload(again)), duplicate: true, link: null });
    }
    return c.json(apiError(ERROR_CODES.service_unavailable, "The link could not be created.", auth.requestId), 503);
  }

  let balance = (await ensureWallet(auth.user.id)).cachedBalance;
  if (cost > 0) {
    try {
      const hold = await holdCredits(auth.user.id, cost, id, auth.user.id, CAPTURE_ACTION);
      balance = hold.balanceAfter;
    } catch (err) {
      await db.delete(captureRequests).where(eq(captureRequests.id, id));
      if ((err as { code?: string }).code === "insufficient_credits") {
        return c.json(apiError(ERROR_CODES.insufficient_credits, "Not enough credits to create this link", auth.requestId), 402);
      }
      throw err;
    }
  }

  await audit(auth.user.id, "capture.create", id);
  const [row] = await db.select().from(captureRequests).where(eq(captureRequests.id, id)).limit(1);
  return c.json({ ...(await ownerPayload(row!)), link: linkFor(token), cost, balance, duplicate: false }, 201);
});

captureRoutes.get("/captures", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  const db = getDb();
  const rows = await db
    .select()
    .from(captureRequests)
    .where(eq(captureRequests.ownerUserId, auth.user.id))
    .orderBy(desc(captureRequests.createdAt))
    .limit(50);
  const fresh = [];
  for (const row of rows) fresh.push(await expireIfNeeded(row));
  return c.json({ requests: await Promise.all(fresh.map((row) => ownerPayload(row))) });
});

captureRoutes.get("/captures/:id", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  const db = getDb();
  const [row] = await db
    .select()
    .from(captureRequests)
    .where(and(eq(captureRequests.id, c.req.param("id")), eq(captureRequests.ownerUserId, auth.user.id)))
    .limit(1);
  if (!row) return notFound(c);
  return c.json(await ownerPayload(await expireIfNeeded(row)));
});

captureRoutes.post("/captures/:id/cancel", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  const db = getDb();
  const [row] = await db
    .select()
    .from(captureRequests)
    .where(and(eq(captureRequests.id, c.req.param("id")), eq(captureRequests.ownerUserId, auth.user.id)))
    .limit(1);
  if (!row) return notFound(c);
  if (row.status !== "open" && row.status !== "capturing") {
    return c.json(apiError(ERROR_CODES.conflict, "This link can no longer be cancelled.", auth.requestId), 409);
  }
  await releaseHold(row.id, auth.user.id);
  await markCaptureCancelled(row.id, auth.user.id);
  const [next] = await db.select().from(captureRequests).where(eq(captureRequests.id, row.id)).limit(1);
  return c.json(await ownerPayload(next ?? { ...row, status: "cancelled" }));
});

captureRoutes.get("/capture-links/:token", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`caplink:${auth.ipHash}`, 60, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests. Try again later.", auth.requestId), 429);
  }
  const row = await byToken(c.req.param("token"));
  if (!row) return notFound(c);
  return c.json(publicState(row));
});

captureRoutes.post("/capture-links/:token/session", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`capsess:${auth.ipHash}`, 30, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests. Try again later.", auth.requestId), 429);
  }
  const row = await byToken(c.req.param("token"));
  if (!row) return notFound(c);
  if (row.status !== "open" && row.status !== "capturing") {
    return c.json(publicState(row), 409);
  }
  const db = getDb();
  const nonce = randomToken(32);
  const nonceExpiresAt = new Date(Date.now() + NONCE_TTL_MS);
  const userAgent = (c.req.header("user-agent") ?? "").slice(0, 300) || null;
  await db
    .update(captureSessions)
    .set({ consumedAt: new Date() })
    .where(and(eq(captureSessions.requestId, row.id), isNull(captureSessions.consumedAt)));
  await db.insert(captureSessions).values({
    requestId: row.id,
    nonceHash: sha256Hex(nonce),
    nonceExpiresAt,
    userAgent,
    ipHash: auth.ipHash,
  });
  await db
    .update(captureRequests)
    .set({ status: "capturing", updatedAt: new Date() })
    .where(eq(captureRequests.id, row.id));
  return c.json({ nonce, expires_at: nonceExpiresAt });
});

captureRoutes.post("/capture-links/:token/frame", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`capframe:${auth.ipHash}`, 10, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many photos. Try again later.", auth.requestId), 429);
  }
  const row = await byToken(c.req.param("token"));
  if (!row) return notFound(c);
  if (requestCanAcceptFrame(row.status, row.updatedAt) && row.status === "processing") {
    await getDb()
      .update(captureRequests)
      .set({ status: "capturing", updatedAt: new Date() })
      .where(and(eq(captureRequests.id, row.id), eq(captureRequests.status, "processing")));
    row.status = "capturing";
  }
  if (row.status !== "capturing") {
    return c.json(apiError(ERROR_CODES.conflict, "This link is not ready for a photo.", auth.requestId), 409);
  }

  const form = await c.req.formData().catch(() => null);
  if (!form) return c.json(apiError(ERROR_CODES.validation_error, "Take a photo before sending.", auth.requestId), 400);
  const nonce = String(form.get("nonce") ?? "");
  if (nonce.length < 8 || nonce.length > 200) {
    return c.json(apiError(ERROR_CODES.validation_error, "Start the capture session again.", auth.requestId), 400);
  }
  const gps = parseGps({
    latitude: form.get("latitude"),
    longitude: form.get("longitude"),
    accuracyM: form.get("accuracy_m"),
  });
  if (!gps.ok) return c.json(apiError(ERROR_CODES.validation_error, gps.message, auth.requestId), 400);
  const image = form.get("image");
  if (!(image instanceof File) || image.size === 0) {
    return c.json(apiError(ERROR_CODES.validation_error, "Take a photo before sending.", auth.requestId), 400);
  }
  if (image.size > LIMITS.maxFileBytes) {
    return c.json(apiError(ERROR_CODES.too_large, "This file exceeds the size or dimension limit.", auth.requestId), 400);
  }

  const db = getDb();
  const [session] = await db
    .select()
    .from(captureSessions)
    .where(and(eq(captureSessions.requestId, row.id), isNull(captureSessions.consumedAt)))
    .orderBy(desc(captureSessions.createdAt))
    .limit(1);
  if (!session || !nonceMatches(session.nonceHash, nonce, session.nonceExpiresAt)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Start the capture session again.", auth.requestId), 400);
  }

  const locked = await db
    .update(captureRequests)
    .set({ status: "processing", updatedAt: new Date() })
    .where(and(eq(captureRequests.id, row.id), eq(captureRequests.status, "capturing")))
    .returning();
  if (!locked.length) {
    return c.json(apiError(ERROR_CODES.conflict, "This photo is already being submitted.", auth.requestId), 409);
  }

  const result = await acceptCaptureFrame({
    request: locked[0]!,
    session,
    buf: Buffer.from(await image.arrayBuffer()),
    gps: gps.value,
    cameraReported: form.get("camera_reported") === "true",
    device: parseDeviceReport(form.get("device_report")),
  });
  if (!result.ok) {
    const status = result.status === 503 ? 503 : 400;
    return c.json(apiError(result.code, result.message, auth.requestId), status);
  }
  await audit(row.ownerUserId, "capture.complete", row.id);
  return c.json({ status: "completed", reference: row.referenceCode }, 201);
});
