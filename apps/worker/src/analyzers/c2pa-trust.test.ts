import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  C2PA_INTERIM_TRUST_LIST_URL,
  C2PA_TRUST_LIST_URL,
  ensureTrustAnchors,
  pemCertificates,
  resetTrustCache,
} from "./c2pa-trust.js";

const ONE = "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----\n";
const TWO = "-----BEGIN CERTIFICATE-----\nBBBB\n-----END CERTIFICATE-----\n";

describe("C2PA trust list store", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "okm-trust-"));
    process.env.C2PA_TRUST_DIR = dir;
    delete process.env.C2PA_TRUST_LIST_VERSION;
    resetTrustCache();
  });

  afterEach(async () => {
    delete process.env.C2PA_TRUST_DIR;
    vi.unstubAllGlobals();
    resetTrustCache();
    await rm(dir, { recursive: true, force: true });
  });

  it("strips comments and keeps certificate blocks", () => {
    const text = `## frozen list\n\n${ONE}not a cert\n${TWO}`;
    expect(pemCertificates(text)).toBe(`${ONE}${TWO}`);
  });

  it("writes both lists and reuses the file when a later download fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url === C2PA_TRUST_LIST_URL) return new Response(`# official\n${ONE}`, { status: 200 });
        if (url === C2PA_INTERIM_TRUST_LIST_URL) return new Response(TWO, { status: 200 });
        return new Response("missing", { status: 404 });
      }),
    );

    const first = await ensureTrustAnchors();
    expect(first.anchorsPath).toBe(join(dir, "anchors.pem"));
    expect(first.version).toMatch(/^c2pa-trust-\d{4}-\d{2}-\d{2}-[a-f0-9]{12}$/);
    const written = await readFile(first.anchorsPath!, "utf8");
    expect(written.match(/BEGIN CERTIFICATE/g)).toHaveLength(2);
    expect(written).not.toContain("# official");

    resetTrustCache();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    const second = await ensureTrustAnchors();
    expect(second.anchorsPath).toBe(first.anchorsPath);
    expect(second.version).toBe(first.version);
  });

  it("reports unavailable when nothing has been stored", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 200 })),
    );
    const stored = await ensureTrustAnchors();
    expect(stored.anchorsPath).toBeNull();
    expect(stored.version).toBe("c2pa-trust-unavailable");
  });
});
