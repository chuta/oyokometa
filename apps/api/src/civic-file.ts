import { ERROR_CODES } from "@oyokometa/config";
import { assets, civicEvidenceItems, getDb } from "@oyokometa/db";
import { decodeImage, moderateAdultContent, scanMalware } from "@oyokometa/worker";
import { eq } from "drizzle-orm";
import { readBlob, removeBlob } from "./blob.js";

const MESSAGES = {
  unsupported_type: "This file type is not supported. Use JPEG, PNG, WebP, HEIC/HEIF or TIFF.",
  malware_flagged: "This file was flagged by malware scanning and was not analyzed.",
  content_refused: "This file can't be accepted.",
  service_unavailable: "The service is temporarily unavailable.",
  missing: "Upload the image again.",
} as const;

export type ScreenedAsset = { sha256: string; mime: string; byteSize: number; fileName: string | null };

export async function screenCivicAsset(
  assetId: string,
  owner: { userId: string | null; anonId: string | null },
): Promise<{ ok: true; asset: ScreenedAsset } | { ok: false; status: number; code: string; message: string }> {
  const db = getDb();
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset?.sha256 || !asset.detectedMime) return fail(400, ERROR_CODES.validation_error, MESSAGES.missing);
  const owns =
    (owner.userId && asset.ownerUserId === owner.userId) ||
    (!owner.userId && owner.anonId && asset.ownerSessionId === owner.anonId);
  if (!owns) return fail(404, ERROR_CODES.not_found, "Not found");
  if (!asset.detectedMime.startsWith("image/")) return fail(400, ERROR_CODES.unsupported_type, MESSAGES.unsupported_type);

  const [linked] = await db
    .select({ id: civicEvidenceItems.id })
    .from(civicEvidenceItems)
    .where(eq(civicEvidenceItems.assetId, assetId))
    .limit(1);
  if (linked) return fail(409, ERROR_CODES.conflict, "That image is already attached to a submission.");

  let buf: Buffer;
  try {
    buf = await readBlob(asset.storageKey);
  } catch {
    return fail(400, ERROR_CODES.validation_error, MESSAGES.missing);
  }

  try {
    const malware = await scanMalware(buf);
    if (malware.status === "flagged") {
      await discard(asset.storageKey, asset.previewKey, assetId);
      return fail(400, ERROR_CODES.malware_flagged, MESSAGES.malware_flagged);
    }
    const decode = await decodeImage(buf);
    await moderateAdultContent(decode.previewJpeg);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String((err as { code: unknown }).code) : "";
    if (code === "malware_flagged" || code === "content_refused") {
      await discard(asset.storageKey, asset.previewKey, assetId);
      return fail(400, code, code === "content_refused" ? MESSAGES.content_refused : MESSAGES.malware_flagged);
    }
    return fail(503, ERROR_CODES.service_unavailable, MESSAGES.service_unavailable);
  }

  return {
    ok: true,
    asset: {
      sha256: asset.sha256,
      mime: asset.detectedMime,
      byteSize: asset.byteSize ?? buf.length,
      fileName: asset.declaredFilename,
    },
  };
}

function fail(status: number, code: string, message: string) {
  return { ok: false as const, status, code, message };
}

/** Civic files stay until a recorded editorial or legal decision. The hourly job does not delete them. */
export async function holdCivicAsset(assetId: string) {
  await getDb()
    .update(assets)
    .set({ retainUntil: null, updatedAt: new Date() })
    .where(eq(assets.id, assetId));
}

async function discard(storageKey: string, previewKey: string | null, assetId: string) {
  await removeBlob(storageKey);
  if (previewKey) await removeBlob(previewKey);
  await getDb().delete(assets).where(eq(assets.id, assetId));
}
