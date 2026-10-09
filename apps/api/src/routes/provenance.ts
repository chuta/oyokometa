import { Hono } from "hono";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  ERROR_CODES,
  PLATFORM_VERSION,
  RULESET_VERSION,
  PHASH,
  LIMITS,
  VERIFY_HEADLINES,
  VERIFY_SUBLINES,
} from "@oyokometa/config";
import { apiError, canonicalJson, declarationSchema, hammingHex } from "@oyokometa/shared";
import {
  getDb,
  assets,
  analysisJobs,
  provenanceRecords,
  provenanceEvents,
  verificationChecks,
  actionCost,
  holdCredits,
  captureHold,
  releaseHold,
} from "@oyokometa/db";
import { notFound } from "../session.js";
import { allowEndpoint } from "../rate-limit.js";
import { audit } from "../audit.js";
import { getSigner } from "../signing/kms.js";
import { recordHashFromCanonical, stampRecordHash } from "../signing/tsa.js";
import { signEvent, sha256Utf8, verifyEventChain, type EventType } from "../signing/events.js";
import { declarationContradictions } from "../signing/contradictions.js";
import { qrSvg } from "../signing/qr.js";
import { randomToken } from "../crypto.js";
import { readBlob } from "../blob.js";
import { publicAppOrigin } from "../origin.js";
import { sha256, perceptualHash } from "@oyokometa/worker/hash";

export const provenanceRoutes = new Hono();

const MODES = new Set(["file_registration", "creator_declaration", "organization_declaration"]);

provenanceRoutes.get("/provenance", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const rows = await db
    .select()
    .from(provenanceRecords)
    .where(eq(provenanceRecords.ownerUserId, auth.user.id))
    .orderBy(desc(provenanceRecords.createdAt))
    .limit(50);
  return c.json({
    records: rows.map((r) => ({
      id: r.id,
      public_id: r.publicId,
      status: r.status,
      visibility: r.visibility,
      mode: r.mode,
      created_at: r.createdAt,
      asset_sha256: r.assetSha256,
    })),
  });
});

provenanceRoutes.post("/provenance", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`pr:${auth.ipHash}`, 10)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required to register a record", auth.requestId), 401);
  }
  if (!auth.user.emailVerified) {
    return c.json(
      apiError(ERROR_CODES.email_unverified, "Verify your email before registering provenance", auth.requestId),
      403,
    );
  }
  const idem = c.req.header("Idempotency-Key") ?? crypto.randomUUID();
  const body = await c.req.json<{
    asset_id?: string;
    mode?: string;
    declarations?: unknown;
    visibility?: string;
    show_thumbnail?: boolean;
    display_name?: string | null;
    attestation?: boolean;
  }>();
  if (!body.attestation) {
    return c.json(
      apiError(ERROR_CODES.validation_error, "Accept the registration attestation to continue", auth.requestId),
      400,
    );
  }
  const mode = body.mode ?? "file_registration";
  if (!MODES.has(mode)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Unknown registration mode", auth.requestId), 400);
  }
  const parsed = declarationSchema.safeParse(body.declarations ?? {});
  if (!parsed.success) {
    return c.json(apiError(ERROR_CODES.validation_error, "Invalid declarations", auth.requestId), 400);
  }
  const visibility = body.visibility === "public" ? "public" : "private";
  const db = getDb();
  const [dup] = await db
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.actor, `idem:${idem}`))
    .limit(1);
  if (dup) {
    const [existing] = await db
      .select()
      .from(provenanceRecords)
      .where(eq(provenanceRecords.id, dup.recordId))
      .limit(1);
    if (existing) return c.json({ id: existing.id, public_id: existing.publicId }, 200);
  }

  if (!body.asset_id) {
    return c.json(apiError(ERROR_CODES.validation_error, "asset_id is required", auth.requestId), 400);
  }
  const [asset] = await db.select().from(assets).where(eq(assets.id, body.asset_id)).limit(1);
  if (!asset || asset.ownerUserId !== auth.user.id || asset.imageDeletedAt) return notFound(c);
  if (!asset.sha256) {
    return c.json(
      apiError(ERROR_CODES.validation_error, "Baseline analysis must finish before registration", auth.requestId),
      400,
    );
  }
  const [job] = await db
    .select()
    .from(analysisJobs)
    .where(and(eq(analysisJobs.assetId, asset.id), eq(analysisJobs.status, "completed")))
    .orderBy(desc(analysisJobs.completedAt))
    .limit(1);
  if (!job) {
    return c.json(
      apiError(ERROR_CODES.validation_error, "Baseline analysis must finish before registration", auth.requestId),
      400,
    );
  }

  const recordId = crypto.randomUUID();
  const publicId = randomToken(16);
  const cost = await actionCost("provenance_registration");
  if (cost > 0) {
    try {
      await holdCredits(auth.user.id, cost, recordId, auth.user.id, "provenance_record");
    } catch (err) {
      if ((err as { code?: string }).code === "insufficient_credits") {
        return c.json(
          apiError(ERROR_CODES.insufficient_credits, "Not enough credits to register this file", auth.requestId),
          402,
        );
      }
      throw err;
    }
  }

  const findings = job.findings as {
    identity?: { width?: number; height?: number };
    timeline?: Array<{ value?: string }>;
    c2pa?: { ai_assertion?: string | null };
    evidence?: Array<{ signal?: string; value?: string }>;
  } | null;
  const contradictions = declarationContradictions(parsed.data, findings);
  const registeredAt = new Date().toISOString();
  const signer = getSigner();
  const dimensions =
    findings?.identity?.width && findings?.identity?.height
      ? `${findings.identity.width}×${findings.identity.height}`
      : asset.width && asset.height
        ? `${asset.width}×${asset.height}`
        : null;
  const canonicalPayload = {
    credential_type: "platform_signed_record",
    public_id: publicId,
    asset_sha256: asset.sha256,
    phash: asset.phash,
    mime_type: asset.detectedMime,
    dimensions,
    byte_size: asset.byteSize ? Number(asset.byteSize) : null,
    registered_at: registeredAt,
    mode,
    visibility,
    declarations: parsed.data,
    baseline_job_id: job.id,
    ruleset_version: job.rulesetVersion ?? RULESET_VERSION,
    signing_key_id: signer.keyId,
    platform_version: PLATFORM_VERSION,
    show_thumbnail: Boolean(body.show_thumbnail),
    contradictions,
  };
  const canonical = canonicalJson(canonicalPayload);
  try {
    const signature = await signer.signPayload(canonicalPayload);
    const hash = recordHashFromCanonical(canonical);
    const tsa = await stampRecordHash(hash);
    const thumbnailKey = body.show_thumbnail && visibility === "public" ? asset.previewKey : null;
    await db.insert(provenanceRecords).values({
      id: recordId,
      publicId,
      assetSha256: asset.sha256,
      phash: asset.phash,
      ownerUserId: auth.user.id,
      mode,
      visibility,
      status: "active",
      declarations: parsed.data,
      credentialType: "platform_signed_record",
      signingKeyId: signer.keyId,
      signature,
      tsaToken: tsa.token,
      baselineJobId: job.id,
      showThumbnail: Boolean(body.show_thumbnail) && visibility === "public",
      thumbnailKey,
      mimeType: asset.detectedMime,
      dimensions,
      byteSize: asset.byteSize ? Number(asset.byteSize) : null,
      displayName: body.display_name?.trim() || null,
      canonicalJson: canonical,
      createdAt: new Date(registeredAt),
      updatedAt: new Date(registeredAt),
    });
    const eventId = crypto.randomUUID();
    const createdAt = registeredAt;
    const inputHash = sha256Utf8(canonical);
    const signed = await signEvent(signer, {
      id: eventId,
      recordId,
      type: "REGISTERED",
      actor: `idem:${idem}`,
      payload: { mode, visibility },
      prevEventHash: null,
      createdAt,
      inputHash,
    });
    await db.insert(provenanceEvents).values({
      id: eventId,
      recordId,
      type: "REGISTERED",
      actor: `idem:${idem}`,
      inputHash,
      outputHash: signed.outputHash,
      payload: { mode, visibility },
      signature: signed.signature,
      prevEventHash: null,
      createdAt: new Date(createdAt),
    });
    if (cost > 0) await captureHold(recordId, auth.user.id);
    await audit(auth.user.id, "provenance.register", recordId);
    const origin = publicAppOrigin();
    return c.json(
      {
        id: recordId,
        public_id: publicId,
        verify_url: `${origin}/verify/${publicId}`,
        credential_type: "platform_signed_record",
        contradictions,
        timestamp_source: tsa.source,
      },
      201,
    );
  } catch (err) {
    if (cost > 0) await releaseHold(recordId, auth.user.id).catch(() => undefined);
    throw err;
  }
});

provenanceRoutes.get("/provenance/:id", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [row] = await db.select().from(provenanceRecords).where(eq(provenanceRecords.id, c.req.param("id"))).limit(1);
  if (!row || row.ownerUserId !== auth.user.id) return notFound(c);
  const events = await db
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.recordId, row.id))
    .orderBy(asc(provenanceEvents.createdAt));
  return c.json(await ownerView(row, events));
});

provenanceRoutes.post("/provenance/:id/events", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  const [row] = await db.select().from(provenanceRecords).where(eq(provenanceRecords.id, c.req.param("id"))).limit(1);
  if (!row || row.ownerUserId !== auth.user.id) return notFound(c);
  if (row.status === "withdrawn") {
    return c.json(apiError(ERROR_CODES.conflict, "This record is withdrawn", auth.requestId), 409);
  }
  const body = await c.req.json<{ type?: string; payload?: Record<string, unknown> }>();
  const type = body.type as EventType | undefined;
  if (!type || !["DECLARATION_ADDED", "VISIBILITY_CHANGED", "WITHDRAWN"].includes(type)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Unsupported event type", auth.requestId), 400);
  }
  const events = await db
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.recordId, row.id))
    .orderBy(asc(provenanceEvents.createdAt));
  const last = events[events.length - 1];
  const signer = getSigner();
  const eventId = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  let payload: Record<string, unknown> = body.payload ?? {};
  const patch: Partial<typeof row> = { updatedAt: new Date() };
  if (type === "DECLARATION_ADDED") {
    const parsed = declarationSchema.safeParse(payload);
    if (!parsed.success) {
      return c.json(apiError(ERROR_CODES.validation_error, "Invalid declarations", auth.requestId), 400);
    }
    payload = parsed.data;
    patch.declarations = { ...(row.declarations as object), ...parsed.data };
  }
  if (type === "VISIBILITY_CHANGED") {
    const vis = payload.visibility === "public" ? "public" : "private";
    payload = { visibility: vis };
    patch.visibility = vis;
    if (vis === "private") {
      patch.showThumbnail = false;
    }
  }
  if (type === "WITHDRAWN") {
    payload = { withdrawn_at: createdAt };
    patch.status = "withdrawn";
    patch.showThumbnail = false;
    patch.thumbnailKey = null;
    patch.declarations = {};
    patch.displayName = null;
  }
  const signed = await signEvent(signer, {
    id: eventId,
    recordId: row.id,
    type,
    actor: auth.user.id,
    payload,
    prevEventHash: last?.outputHash ?? null,
    createdAt,
    inputHash: last?.outputHash ?? sha256Utf8(row.canonicalJson),
  });
  await db.insert(provenanceEvents).values({
    id: eventId,
    recordId: row.id,
    type,
    actor: auth.user.id,
    inputHash: last?.outputHash ?? sha256Utf8(row.canonicalJson),
    outputHash: signed.outputHash,
    payload,
    signature: signed.signature,
    prevEventHash: last?.outputHash ?? null,
    createdAt: new Date(createdAt),
  });
  await db.update(provenanceRecords).set(patch).where(eq(provenanceRecords.id, row.id));
  await audit(auth.user.id, `provenance.${type.toLowerCase()}`, row.id);
  return c.json({ ok: true, event_id: eventId });
});

provenanceRoutes.get("/verify/:public_id", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`vg:${auth.ipHash}`, 60)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  const view = await publicRecordView(c.req.param("public_id"), auth.user?.id ?? null);
  if (!view) return notFound(c);
  return c.json(view);
});

provenanceRoutes.get("/verify/:public_id/thumbnail", async (c) => {
  const auth = c.get("auth");
  const view = await publicRecordView(c.req.param("public_id"), auth.user?.id ?? null);
  if (!view || !view.show_thumbnail || !view.thumbnail_available || view.status !== "active") {
    return notFound(c);
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(provenanceRecords)
    .where(eq(provenanceRecords.publicId, c.req.param("public_id")))
    .limit(1);
  if (!row?.thumbnailKey) return notFound(c);
  const buf = await readBlob(row.thumbnailKey);
  return c.body(buf, 200, {
    "content-type": "image/jpeg",
    "x-content-type-options": "nosniff",
    "content-disposition": "inline; filename=preview.jpg",
    "cache-control": "private, max-age=60",
  });
});

provenanceRoutes.post("/verify", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`vf:${auth.ipHash}`, 30)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  const body = await c.req.json<{ sha256?: string; phash?: string; public_id?: string }>();
  const sha = body.sha256?.toLowerCase().replace(/[^0-9a-f]/g, "");
  if (!sha || sha.length !== 64) {
    return c.json(apiError(ERROR_CODES.validation_error, "sha256 is required", auth.requestId), 400);
  }
  const db = getDb();
  const userId = auth.user?.id ?? null;

  if (body.public_id) {
    const [row] = await db
      .select()
      .from(provenanceRecords)
      .where(eq(provenanceRecords.publicId, body.public_id))
      .limit(1);
    const visible = row && (row.visibility === "public" || row.ownerUserId === userId);
    if (!row || !visible) return notFound(c);
    const outcome = await outcomeFor(row, sha, body.phash ?? null, userId);
    await db.insert(verificationChecks).values({
      recordId: row.id,
      submittedSha256: sha,
      matchType: outcome.match_type,
    });
    return c.json(outcome);
  }

  const candidates = await db.select().from(provenanceRecords).limit(4000);
  const visible = candidates.filter((r) => r.visibility === "public" || r.ownerUserId === userId);
  const exact = visible.find((r) => r.assetSha256 === sha);
  if (exact) {
    const outcome = await outcomeFor(exact, sha, body.phash ?? null, userId);
    await db.insert(verificationChecks).values({
      recordId: exact.id,
      submittedSha256: sha,
      matchType: outcome.match_type,
    });
    return c.json(outcome);
  }
  if (body.phash) {
    const similar = visible.find(
      (r) => r.phash && r.status === "active" && hammingHex(r.phash, body.phash!) <= PHASH.hammingThreshold,
    );
    if (similar) {
      await db.insert(verificationChecks).values({
        recordId: similar.id,
        submittedSha256: sha,
        matchType: "similar",
      });
      return c.json({
        match_type: "similar",
        headline: VERIFY_HEADLINES.similar,
        sub_line: VERIFY_SUBLINES.similar,
        public_id: similar.visibility === "public" ? similar.publicId : undefined,
      });
    }
  }
  await db.insert(verificationChecks).values({
    recordId: null,
    submittedSha256: sha,
    matchType: "no_match",
  });
  return c.json({
    match_type: "no_match",
    headline: VERIFY_HEADLINES.no_match,
    sub_line: VERIFY_SUBLINES.no_match,
  });
});

provenanceRoutes.post("/verify/file", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`vff:${auth.ipHash}`, 10)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  const buf = Buffer.from(await c.req.arrayBuffer());
  if (buf.length > LIMITS.maxFileBytes) {
    return c.json(apiError(ERROR_CODES.too_large, "This file exceeds the size limit.", auth.requestId), 413);
  }
  const sha = sha256(buf);
  let phash: string | null = null;
  try {
    phash = await perceptualHash(buf);
  } catch {
    phash = null;
  }
  const publicId = c.req.query("public_id");
  const db = getDb();
  const userId = auth.user?.id ?? null;
  if (publicId) {
    const [row] = await db.select().from(provenanceRecords).where(eq(provenanceRecords.publicId, publicId)).limit(1);
    const visible = row && (row.visibility === "public" || row.ownerUserId === userId);
    if (!row || !visible) return notFound(c);
    const outcome = await outcomeFor(row, sha, phash, userId);
    await db.insert(verificationChecks).values({
      recordId: row.id,
      submittedSha256: sha,
      matchType: outcome.match_type,
    });
    return c.json({ ...outcome, sha256: sha, hashed_on: "server" });
  }
  const res = await fetchOutcomeByHash(sha, phash, userId);
  return c.json({ ...res, sha256: sha, hashed_on: "server" });
});

async function fetchOutcomeByHash(sha: string, phash: string | null, userId: string | null) {
  const db = getDb();
  const candidates = await db.select().from(provenanceRecords).limit(4000);
  const visible = candidates.filter((r) => r.visibility === "public" || r.ownerUserId === userId);
  const exact = visible.find((r) => r.assetSha256 === sha);
  if (exact) {
    const outcome = await outcomeFor(exact, sha, phash, userId);
    await db.insert(verificationChecks).values({
      recordId: exact.id,
      submittedSha256: sha,
      matchType: outcome.match_type,
    });
    return outcome;
  }
  if (phash) {
    const similar = visible.find(
      (r) => r.phash && r.status === "active" && hammingHex(r.phash, phash) <= PHASH.hammingThreshold,
    );
    if (similar) {
      await db.insert(verificationChecks).values({
        recordId: similar.id,
        submittedSha256: sha,
        matchType: "similar",
      });
      return {
        match_type: "similar",
        headline: VERIFY_HEADLINES.similar,
        sub_line: VERIFY_SUBLINES.similar,
        public_id: similar.visibility === "public" ? similar.publicId : undefined,
      };
    }
  }
  await db.insert(verificationChecks).values({
    recordId: null,
    submittedSha256: sha,
    matchType: "no_match",
  });
  return {
    match_type: "no_match",
    headline: VERIFY_HEADLINES.no_match,
    sub_line: VERIFY_SUBLINES.no_match,
  };
}

async function outcomeFor(
  row: typeof provenanceRecords.$inferSelect,
  sha: string,
  phash: string | null,
  userId: string | null,
) {
  const signer = getSigner();
  const sigOk = await signer.verifyJws(row.signature);
  const events = await getDb()
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.recordId, row.id))
    .orderBy(asc(provenanceEvents.createdAt));
  const chain = verifyEventChain(
    row.canonicalJson,
    events.map((e) => ({
      inputHash: e.inputHash,
      outputHash: e.outputHash,
      prevEventHash: e.prevEventHash,
      type: e.type,
    })),
  );
  if (!sigOk || !chain.ok || row.status === "withdrawn" || row.status === "disputed") {
    return {
      match_type: "record_problem",
      headline: VERIFY_HEADLINES.record_problem,
      sub_line: recordProblemReason(row, sigOk, chain.ok),
      public_id: row.publicId,
    };
  }
  if (row.assetSha256 === sha) {
    return {
      match_type: "exact",
      headline: VERIFY_HEADLINES.exact,
      sub_line: VERIFY_SUBLINES.exact,
      public_id: row.publicId,
    };
  }
  if (
    phash &&
    row.phash &&
    hammingHex(row.phash, phash) <= PHASH.hammingThreshold &&
    (row.visibility === "public" || row.ownerUserId === userId)
  ) {
    return {
      match_type: "similar",
      headline: VERIFY_HEADLINES.similar,
      sub_line: VERIFY_SUBLINES.similar,
      public_id: row.visibility === "public" ? row.publicId : undefined,
    };
  }
  return {
    match_type: "no_match",
    headline: VERIFY_HEADLINES.no_match,
    sub_line: VERIFY_SUBLINES.no_match,
    public_id: row.publicId,
  };
}

function recordProblemReason(
  row: typeof provenanceRecords.$inferSelect,
  sigOk: boolean,
  chainOk: boolean,
) {
  if (row.status === "withdrawn") return `Withdrawn on ${row.updatedAt.toISOString().slice(0, 10)}.`;
  if (row.status === "disputed") return "This record is disputed and is pending review.";
  if (!sigOk) return "The signature on this record did not validate against the published key.";
  if (!chainOk) return "The event history for this record did not validate.";
  return "The timestamp or signature check failed.";
}

async function publicRecordView(publicId: string, userId: string | null) {
  const db = getDb();
  const [row] = await db.select().from(provenanceRecords).where(eq(provenanceRecords.publicId, publicId)).limit(1);
  if (!row) return null;
  const isRegistrant = Boolean(userId && row.ownerUserId === userId);
  if (row.visibility !== "public" && !isRegistrant) return null;
  const events = await db
    .select()
    .from(provenanceEvents)
    .where(eq(provenanceEvents.recordId, row.id))
    .orderBy(asc(provenanceEvents.createdAt));
  const signer = getSigner();
  const sigOk = await signer.verifyJws(row.signature);
  const chain = verifyEventChain(
    row.canonicalJson,
    events.map((e) => ({
      inputHash: e.inputHash,
      outputHash: e.outputHash,
      prevEventHash: e.prevEventHash,
      type: e.type,
    })),
  );
  const tsaClock = (() => {
    try {
      const raw = Buffer.from(row.tsaToken ?? "", "base64url").toString("utf8");
      const j = JSON.parse(raw) as { source?: string; type?: string };
      return j.type === "platform_clock";
    } catch {
      return false;
    }
  })();
  let signature_status: "valid" | "invalid" | "withdrawn" | "disputed" = sigOk && chain.ok ? "valid" : "invalid";
  if (row.status === "withdrawn") signature_status = "withdrawn";
  if (row.status === "disputed") signature_status = "disputed";
  const withdrawn = row.status === "withdrawn";
  const publicPeers = await db
    .select()
    .from(provenanceRecords)
    .where(and(eq(provenanceRecords.assetSha256, row.assetSha256), eq(provenanceRecords.visibility, "public")));
  const n = publicPeers.length;
  const earliest = publicPeers.map((p) => p.createdAt).sort((a, b) => a.getTime() - b.getTime())[0];
  const origin = publicAppOrigin();
  const verifyUrl = `${origin}/verify/${row.publicId}`;
  const canonical = JSON.parse(row.canonicalJson) as { contradictions?: string[] };
  return {
    public_id: row.publicId,
    credential_type: row.credentialType,
    status: row.status,
    visibility: row.visibility,
    mode: row.mode,
    mime_type: row.mimeType,
    dimensions: row.dimensions,
    byte_size: row.byteSize,
    registered_at: row.createdAt,
    display_name: withdrawn ? null : row.displayName,
    declarations: withdrawn ? {} : row.declarations,
    events: events.map((e) => ({
      type: e.type,
      created_at: e.createdAt,
    })),
    signing_key_id: row.signingKeyId,
    signature_status,
    timestamp_note: tsaClock
      ? "Registration time is Oyokometa's clock (no independent timestamp)."
      : "An independent timestamp token is attached to this record.",
    show_thumbnail: !withdrawn && row.showThumbnail,
    thumbnail_available: Boolean(!withdrawn && row.showThumbnail && row.thumbnailKey),
    thumbnail_url:
      !withdrawn && row.showThumbnail && row.thumbnailKey
        ? `/api/v1/verify/${row.publicId}/thumbnail`
        : null,
    verify_url: verifyUrl,
    qr_svg: await qrSvg(verifyUrl),
    duplicate_note:
      row.visibility === "public" && n > 1 && earliest
        ? `This file has ${n} registrations. The earliest was on ${earliest.toISOString().slice(0, 10)}.`
        : null,
    contradictions: withdrawn ? [] : canonical.contradictions ?? [],
    is_registrant: isRegistrant,
    record_problem:
      signature_status !== "valid"
        ? {
            headline: VERIFY_HEADLINES.record_problem,
            sub_line: recordProblemReason(row, sigOk, chain.ok),
          }
        : null,
    standing_line:
      "This page reports a signed registration of a file. It makes no statement about any person shown or named.",
  };
}

async function ownerView(
  row: typeof provenanceRecords.$inferSelect,
  events: Array<typeof provenanceEvents.$inferSelect>,
) {
  const pub = await publicRecordView(row.publicId, row.ownerUserId);
  return {
    ...pub,
    id: row.id,
    asset_sha256: row.assetSha256,
    canonical: row.canonicalJson,
    signature: row.signature,
    event_chain: events.map((e) => ({
      id: e.id,
      type: e.type,
      input_hash: e.inputHash,
      output_hash: e.outputHash,
      prev_event_hash: e.prevEventHash,
      created_at: e.createdAt,
    })),
  };
}
