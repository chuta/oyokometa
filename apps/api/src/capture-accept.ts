import { ERROR_CODES, LIMITS, PLATFORM_VERSION, RULESET_VERSION } from "@oyokometa/config";
import {
  assets,
  captureFrames,
  captureHold,
  captureRequests,
  captureSessions,
  getDb,
  provenanceEvents,
  provenanceRecords,
  releaseHold,
} from "@oyokometa/db";
import { canonicalJson, detectMagic } from "@oyokometa/shared";
import { decodeImage, moderateAdultContent, perceptualHash, scanMalware, sha256 } from "@oyokometa/worker";
import { and, eq } from "drizzle-orm";
import { removeBlob, writeBlob } from "./blob.js";
import { captureBlock, type Gps } from "./capture.js";
import { randomToken } from "./crypto.js";
import { getSigner } from "./signing/kms.js";
import { sha256Utf8, signEvent } from "./signing/events.js";
import { stampRecord } from "./signing/tsa.js";

const MESSAGES = {
  unsupported_type: "This file type is not supported. Use JPEG, PNG, WebP, HEIC/HEIF or TIFF.",
  too_large: "This file exceeds the size or dimension limit.",
  corrupt: "This file could not be decoded.",
  malware_flagged: "This file was flagged by malware scanning and was not analyzed.",
  content_refused: "This file can't be accepted.",
  timeout: "Analysis timed out. You were not charged.",
  service_unavailable: "The service is temporarily unavailable.",
} as const;

type FailCode = keyof typeof MESSAGES;

export type CaptureFailure = {
  ok: false;
  status: number;
  code: string;
  message: string;
};

export type CaptureSuccess = { ok: true; publicId: string };

function classify(err: unknown): FailCode {
  const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
  if (code in MESSAGES) return code as FailCode;
  const msg = err instanceof Error ? err.message : "";
  if (/unsupported|heif|input/i.test(msg)) return "corrupt";
  return "service_unavailable";
}

function httpStatus(code: FailCode) {
  if (code === "content_refused" || code === "malware_flagged") return 400;
  if (code === "service_unavailable" || code === "timeout") return 503;
  return 400;
}

async function cleanup(keys: string[], assetId: string | null) {
  for (const key of keys) await removeBlob(key);
  if (assetId) {
    await getDb().delete(assets).where(eq(assets.id, assetId));
  }
}

async function reopen(requestId: string) {
  await getDb()
    .update(captureRequests)
    .set({ status: "capturing", updatedAt: new Date() })
    .where(and(eq(captureRequests.id, requestId), eq(captureRequests.status, "processing")));
}

/**
 * Hash, scan, and sign one camera frame. A refusal ends the link. A scanner or
 * signing outage leaves the link open so the recipient can send the frame again.
 */
export async function acceptCaptureFrame(input: {
  request: typeof captureRequests.$inferSelect;
  session: typeof captureSessions.$inferSelect;
  buf: Buffer;
  gps: Gps | null;
  cameraReported: boolean;
}): Promise<CaptureSuccess | CaptureFailure> {
  const db = getDb();
  const request = input.request;
  const keys: string[] = [];
  let assetId: string | null = null;
  let committed = false;
  const storageKey = `originals/${crypto.randomUUID()}`;

  try {
    if (input.buf.length > LIMITS.maxFileBytes) {
      await reopen(request.id);
      return { ok: false, status: 400, code: ERROR_CODES.too_large, message: MESSAGES.too_large };
    }
    const magic = detectMagic(input.buf);
    if (!magic.mime) {
      await reopen(request.id);
      return { ok: false, status: 400, code: ERROR_CODES.unsupported_type, message: MESSAGES.unsupported_type };
    }

    await writeBlob(storageKey, input.buf, magic.mime);
    keys.push(storageKey);

    const malware = await scanMalware(input.buf);
    if (malware.status === "flagged") {
      throw Object.assign(new Error(MESSAGES.malware_flagged), { code: "malware_flagged" });
    }

    const decode = await Promise.race([
      decodeImage(input.buf),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "timeout" })), 30_000),
      ),
    ]);
    await moderateAdultContent(decode.previewJpeg);

    const hash = sha256(input.buf);
    let phash: string | null = null;
    try {
      phash = await perceptualHash(input.buf);
    } catch {
      phash = null;
    }
    const previewKey = `previews/${crypto.randomUUID()}.jpg`;
    await writeBlob(previewKey, decode.previewJpeg, "image/jpeg");
    keys.push(previewKey);

    const [asset] = await db
      .insert(assets)
      .values({
        storageKey,
        previewKey,
        sha256: hash,
        phash,
        detectedMime: magic.mime,
        declaredFilename: "capture.jpg",
        byteSize: input.buf.length,
        width: decode.width,
        height: decode.height,
        ownerUserId: request.ownerUserId,
        retainUntil: new Date(Date.now() + 30 * 86400_000),
      })
      .returning();
    if (!asset) throw Object.assign(new Error("asset"), { code: "service_unavailable" });
    assetId = asset.id;

    const receivedAt = new Date().toISOString();
    const userAgent = input.session.userAgent;
    const block = captureBlock({
      receivedAt,
      cameraReported: input.cameraReported,
      location: input.gps,
      userAgent,
    });
    const declarations: Record<string, string> = { capture_prompt: request.prompt };
    if (request.address) declarations.stated_address = request.address;
    const recordId = crypto.randomUUID();
    const publicId = randomToken(16);
    const signer = getSigner();
    const dimensions = decode.width && decode.height ? `${decode.width}×${decode.height}` : null;
    const canonicalPayload = {
      credential_type: "platform_signed_record",
      public_id: publicId,
      asset_sha256: hash,
      phash,
      mime_type: magic.mime,
      dimensions,
      byte_size: input.buf.length,
      registered_at: receivedAt,
      mode: "capture",
      visibility: "private",
      declarations,
      baseline_job_id: null,
      ruleset_version: RULESET_VERSION,
      signing_key_id: signer.keyId,
      platform_version: PLATFORM_VERSION,
      show_thumbnail: false,
      contradictions: [],
      capture: block,
    };
    const canonical = canonicalJson(canonicalPayload);
    const signature = await signer.signPayload(canonicalPayload);
    const tsa = await stampRecord(canonical);
    const thumbnailKey = `thumbnails/${recordId}.jpg`;
    await writeBlob(thumbnailKey, decode.previewJpeg, "image/jpeg");

    await db.insert(provenanceRecords).values({
      id: recordId,
      publicId,
      assetSha256: hash,
      phash,
      ownerUserId: request.ownerUserId,
      mode: "capture",
      visibility: "private",
      status: "active",
      declarations,
      credentialType: "platform_signed_record",
      signingKeyId: signer.keyId,
      signature,
      tsaToken: tsa.token,
      baselineJobId: null,
      showThumbnail: false,
      thumbnailKey,
      mimeType: magic.mime,
      dimensions,
      byteSize: input.buf.length,
      displayName: request.prompt.slice(0, 80),
      canonicalJson: canonical,
      createdAt: new Date(receivedAt),
      updatedAt: new Date(receivedAt),
    });
    const eventId = crypto.randomUUID();
    const inputHash = sha256Utf8(canonical);
    const signed = await signEvent(signer, {
      id: eventId,
      recordId,
      type: "REGISTERED",
      actor: `capture:${request.id}`,
      payload: { mode: "capture", visibility: "private" },
      prevEventHash: null,
      createdAt: receivedAt,
      inputHash,
    });
    await db.insert(provenanceEvents).values({
      id: eventId,
      recordId,
      type: "REGISTERED",
      actor: `capture:${request.id}`,
      inputHash,
      outputHash: signed.outputHash,
      payload: { mode: "capture", visibility: "private" },
      signature: signed.signature,
      prevEventHash: null,
      createdAt: new Date(receivedAt),
    });
    committed = true;
    await db.insert(captureFrames).values({
      requestId: request.id,
      sessionId: input.session.id,
      sha256: hash,
      byteSize: input.buf.length,
      mimeType: magic.mime,
      width: decode.width,
      height: decode.height,
      latitude: input.gps?.latitude ?? null,
      longitude: input.gps?.longitude ?? null,
      accuracyM: input.gps?.accuracyM ?? null,
      cameraReported: input.cameraReported,
      receivedAt: new Date(receivedAt),
    });
    await db
      .update(captureRequests)
      .set({
        status: "completed",
        provenanceRecordId: recordId,
        assetId: asset.id,
        updatedAt: new Date(),
      })
      .where(eq(captureRequests.id, request.id));
    await captureHold(request.id, request.ownerUserId).catch((err) => {
      console.error(JSON.stringify({ msg: "capture_hold_settle_failed", error: String(err) }));
    });
    await db
      .update(captureSessions)
      .set({ consumedAt: new Date() })
      .where(eq(captureSessions.id, input.session.id));
    return { ok: true, publicId };
  } catch (err) {
    const code = classify(err);
    const terminal = code === "malware_flagged" || code === "content_refused";
    if (!committed) await cleanup(keys, assetId);
    if (terminal && !committed) {
      await releaseHold(request.id, "system:capture");
      await db
        .update(captureRequests)
        .set({ status: "refused", updatedAt: new Date() })
        .where(eq(captureRequests.id, request.id));
      await db
        .update(captureSessions)
        .set({ consumedAt: new Date() })
        .where(eq(captureSessions.id, input.session.id));
    } else if (!committed) {
      await reopen(request.id);
    }
    console.error(JSON.stringify({ msg: "capture_frame_failed", code }));
    return { ok: false, status: httpStatus(code), code: ERROR_CODES[code], message: MESSAGES[code] };
  }
}
