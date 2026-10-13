import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

/** Official C2PA trust list (claim-signing anchors). */
export const C2PA_TRUST_LIST_URL =
  "https://raw.githubusercontent.com/c2pa-org/conformance-public/main/trust-list/C2PA-TRUST-LIST.pem";

/**
 * Frozen interim trust list. verify.contentauthenticity.org still uses this.
 * Credentials that chain here remain valid; new anchors go on the official list.
 */
export const C2PA_INTERIM_TRUST_LIST_URL = "https://contentcredentials.org/trust/anchors.pem";

const OK_TTL_MS = 24 * 3600_000;
const STALE_TTL_MS = 15 * 60_000;
const MISSING_TTL_MS = 60_000;

export type StoredTrustList = {
  /** Absolute path to the PEM bundle, or null when no list is on disk. */
  anchorsPath: string | null;
  version: string;
};

type Cache = { files: StoredTrustList; expiresAt: number };

let cache: Cache | null = null;
let inflight: Promise<StoredTrustList> | null = null;

export function resetTrustCache(): void {
  cache = null;
  inflight = null;
}

export function trustDir(): string {
  const pinned = process.env.C2PA_TRUST_DIR?.trim();
  if (pinned) return resolve(pinned);
  const storage = process.env.FS_STORAGE_DIR?.trim() || join(process.cwd(), "data/storage");
  return resolve(dirname(storage), "c2pa-trust");
}

/** Keep only PEM certificate blocks. Comment lines in the interim list are dropped. */
export function pemCertificates(text: string): string {
  const blocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!blocks?.length) throw new Error("response was not a PEM certificate bundle");
  return `${blocks.join("\n")}\n`;
}

export async function ensureTrustAnchors(): Promise<StoredTrustList> {
  if (cache && Date.now() < cache.expiresAt) return cache.files;
  if (!inflight) {
    inflight = loadTrustAnchors().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

async function loadTrustAnchors(): Promise<StoredTrustList> {
  const dir = trustDir();
  const anchorsPath = join(dir, "anchors.pem");
  const metaPath = join(dir, "version.txt");
  const pinnedVersion = process.env.C2PA_TRUST_LIST_VERSION?.trim();

  try {
    await mkdir(dir, { recursive: true });
    const [official, interim] = await Promise.all([
      downloadPem(C2PA_TRUST_LIST_URL),
      downloadPem(C2PA_INTERIM_TRUST_LIST_URL),
    ]);
    const body = `${official}${interim}`;
    const digest = createHash("sha256").update(body).digest("hex").slice(0, 12);
    const day = new Date().toISOString().slice(0, 10);
    const version = pinnedVersion || `c2pa-trust-${day}-${digest}`;
    await writeAtomic(anchorsPath, body);
    await writeAtomic(metaPath, `${version}\n${C2PA_TRUST_LIST_URL}\n${C2PA_INTERIM_TRUST_LIST_URL}\n`);
    const files = { anchorsPath, version };
    cache = { files, expiresAt: Date.now() + OK_TTL_MS };
    return files;
  } catch {
    const stored = await readStored(anchorsPath, metaPath, pinnedVersion);
    cache = {
      files: stored,
      expiresAt: Date.now() + (stored.anchorsPath ? STALE_TTL_MS : MISSING_TTL_MS),
    };
    return stored;
  }
}

async function downloadPem(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const text = await res.text();
  if (text.length > 2_000_000) throw new Error(`${url} was too large`);
  return pemCertificates(text);
}

async function readStored(
  anchorsPath: string,
  metaPath: string,
  pinnedVersion: string | undefined,
): Promise<StoredTrustList> {
  try {
    const body = await readFile(anchorsPath, "utf8");
    pemCertificates(body);
    let version = pinnedVersion || "c2pa-trust-cached";
    if (!pinnedVersion) {
      try {
        const meta = await readFile(metaPath, "utf8");
        version = meta.split("\n")[0]?.trim() || version;
      } catch {
        /* version file missing; the PEM is still usable */
      }
    }
    return { anchorsPath, version };
  } catch {
    return { anchorsPath: null, version: pinnedVersion || "c2pa-trust-unavailable" };
  }
}

async function writeAtomic(path: string, body: string): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, body);
  await rename(tmp, path);
}
