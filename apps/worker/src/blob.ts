import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import * as s3 from "./storage.js";

const root = () => process.env.FS_STORAGE_DIR ?? join(process.cwd(), "data/storage");

export function useFs() {
  return process.env.STORAGE_DRIVER === "fs" || !process.env.S3_ACCESS_KEY;
}

export async function readBlob(key: string): Promise<Buffer> {
  if (useFs()) return readFile(join(root(), key));
  return s3.getObjectBytes(key);
}

export async function writeBlob(key: string, body: Buffer, contentType: string) {
  if (useFs()) {
    const path = join(root(), key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return;
  }
  await s3.putObject(key, body, contentType);
}

export async function removeBlob(key: string) {
  if (useFs()) {
    await unlink(join(root(), key)).catch(() => undefined);
    return;
  }
  await s3.deleteObject(key);
}
