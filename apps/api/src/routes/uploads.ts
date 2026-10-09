import { Hono } from "hono";
import { LIMITS, ERROR_CODES } from "@oyokometa/config";
import { createHash } from "node:crypto";
import { apiError, detectMagic, extensionForMime } from "@oyokometa/shared";
import { getDb, assets } from "@oyokometa/db";
import { allowEndpoint } from "../rate-limit.js";
import { writeBlob, presignPut, useFs } from "../blob.js";
import { notFound } from "../session.js";
import { eq } from "drizzle-orm";

const ERROR_MESSAGES: Record<string, string> = {
  unsupported_type: "This file type is not supported. Use JPEG, PNG, WebP, HEIC/HEIF or TIFF.",
  too_large: "This file exceeds the size or dimension limit.",
  corrupt: "This file could not be decoded.",
  malware_flagged: "This file was flagged by malware scanning and was not analyzed.",
  timeout: "Analysis timed out. You were not charged.",
  service_unavailable: "The service is temporarily unavailable.",
};

export const uploadRoutes = new Hono();

uploadRoutes.post("/uploads", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`up:${auth.ipHash}`, 30)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many uploads", auth.requestId), 429);
  }
  const body = await c.req.json().catch(() => ({} as { filename?: string; content_type?: string; byte_size?: number }));
  if (body.byte_size && body.byte_size > LIMITS.maxFileBytes) {
    return c.json(apiError(ERROR_CODES.too_large, ERROR_MESSAGES.too_large, auth.requestId), 400);
  }
  const db = getDb();
  const key = `originals/${crypto.randomUUID()}`;
  const [asset] = await db
    .insert(assets)
    .values({
      storageKey: key,
      declaredFilename: body.filename ?? null,
      byteSize: body.byte_size ?? null,
      ownerUserId: auth.user?.id ?? null,
      ownerSessionId: auth.user ? null : auth.anon?.id ?? null,
      retainUntil: new Date(Date.now() + (auth.user ? 30 : 1) * 86400_000),
    })
    .returning();
  if (!asset) return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create asset", auth.requestId), 500);

  const signed = await presignPut(key, body.content_type ?? "application/octet-stream");
  const uploadUrl = signed ?? `/api/v1/uploads/${asset.id}/bytes`;
  return c.json({
    asset_id: asset.id,
    upload_url: uploadUrl,
    method: "PUT",
    expires_in: LIMITS.signedUrlTtlSeconds,
    headers: { "Content-Type": body.content_type ?? "application/octet-stream" },
  });
});

uploadRoutes.put("/uploads/:id/bytes", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const db = getDb();
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset) return notFound(c);
  const owner =
    (auth.user && asset.ownerUserId === auth.user.id) ||
    (!auth.user && asset.ownerSessionId && asset.ownerSessionId === auth.anon?.id);
  if (!owner) return notFound(c);

  const ab = await c.req.arrayBuffer();
  const buf = Buffer.from(ab);
  if (buf.length > LIMITS.maxFileBytes) {
    return c.json(apiError(ERROR_CODES.too_large, ERROR_MESSAGES.too_large, auth.requestId), 400);
  }
  const magic = detectMagic(buf);
  if (!magic.mime) {
    return c.json(apiError(ERROR_CODES.unsupported_type, ERROR_MESSAGES.unsupported_type, auth.requestId), 400);
  }
  await writeBlob(asset.storageKey, buf, magic.mime);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  await db
    .update(assets)
    .set({
      detectedMime: magic.mime,
      byteSize: buf.length,
      sha256,
      declaredFilename: asset.declaredFilename ?? `upload.${extensionForMime(magic.mime)}`,
      updatedAt: new Date(),
    })
    .where(eq(assets.id, id));
  return c.json({ ok: true, detected_type: magic.mime, byte_size: buf.length });
});

uploadRoutes.get("/previews/:id", async (c) => {
  const auth = c.get("auth");
  const id = c.req.param("id");
  const db = getDb();
  const [asset] = await db.select().from(assets).where(eq(assets.id, id)).limit(1);
  if (!asset?.previewKey || asset.imageDeletedAt) return notFound(c);
  const owner =
    (auth.user && asset.ownerUserId === auth.user.id) ||
    (!auth.user && asset.ownerSessionId === auth.anon?.id);
  if (!owner) return notFound(c);
  if (!useFs()) return notFound(c);
  const { readBlob } = await import("../blob.js");
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
