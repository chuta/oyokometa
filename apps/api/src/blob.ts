import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { LIMITS } from "@oyokometa/config";

const root = () => process.env.FS_STORAGE_DIR ?? join(process.cwd(), "data/storage");

export function useFs() {
  return process.env.STORAGE_DRIVER === "fs" || !process.env.S3_ACCESS_KEY;
}

function client() {
  return new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.S3_SECRET_KEY ?? "",
    },
  });
}

const bucket = () => process.env.S3_BUCKET ?? "oyokometa-assets";

export async function writeBlob(key: string, body: Buffer, contentType: string) {
  if (useFs()) {
    const path = join(root(), key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return;
  }
  await client().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }),
  );
}

export async function readBlob(key: string) {
  if (useFs()) return readFile(join(root(), key));
  const out = await client().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
  const bytes = await out.Body?.transformToByteArray();
  if (!bytes) throw new Error("empty");
  return Buffer.from(bytes);
}

export async function removeBlob(key: string) {
  if (useFs()) {
    await unlink(join(root(), key)).catch(() => undefined);
    return;
  }
  await client().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
}

/** Legacy records point at the asset preview; only per-record copies may be deleted with the record. */
export async function removeOwnedThumbnail(key: string | null | undefined) {
  if (key?.startsWith("thumbnails/")) await removeBlob(key);
}

export async function presignPut(key: string, contentType: string) {
  if (useFs()) return null;
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }),
    { expiresIn: LIMITS.signedUrlTtlSeconds },
  );
}

export async function presignGet(key: string) {
  if (useFs()) return null;
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), {
    expiresIn: LIMITS.signedUrlTtlSeconds,
  });
}
