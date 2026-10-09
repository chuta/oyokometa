import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { LocalPemSigner, parseJws } from "./kms.js";
import { canonicalJson } from "@oyokometa/shared";
import { signEvent, verifyEventChain, sha256Utf8 } from "./events.js";
import { declarationContradictions } from "./contradictions.js";
import { buildTimestampQuery, recordHashFromCanonical } from "./tsa.js";
import { VERIFY_HEADLINES } from "@oyokometa/config";

function pem() {
  return generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey.export({
    type: "pkcs8",
    format: "pem",
  }).toString();
}

describe("platform_signed_record JWS", () => {
  it("signs canonical JSON with ES256 and verifies", async () => {
    const signer = new LocalPemSigner(pem(), "okm-test-1");
    const payload = { asset_sha256: "ab", public_id: "x", credential_type: "platform_signed_record" };
    const jws = await signer.signPayload(payload);
    expect(await signer.verifyJws(jws)).toBe(true);
    const parsed = parseJws(jws);
    expect(parsed.header.kid).toBe("okm-test-1");
    expect(parsed.header.alg).toBe("ES256");
    expect(canonicalJson(parsed.payload)).toBe(canonicalJson(payload));
    const pub = signer.publishedKey();
    expect(pub.crv).toBe("P-256");
    expect(pub.x.length).toBeGreaterThan(10);
  });

  it("rejects a tampered payload", async () => {
    const signer = new LocalPemSigner(pem(), "okm-test-1");
    const jws = await signer.signPayload({ a: 1 });
    const parts = jws.split(".");
    parts[1] = Buffer.from(canonicalJson({ a: 2 })).toString("base64url");
    expect(await signer.verifyJws(parts.join("."))).toBe(false);
  });
});

describe("event chain", () => {
  it("hashes REGISTERED then WITHDRAWN in order", async () => {
    const signer = new LocalPemSigner(pem(), "okm-test-1");
    const canonical = canonicalJson({ public_id: "p", asset_sha256: "aa" });
    const genesis = sha256Utf8(canonical);
    const e1 = await signEvent(signer, {
      id: "e1",
      recordId: "r1",
      type: "REGISTERED",
      actor: "u1",
      payload: { mode: "file_registration" },
      prevEventHash: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      inputHash: genesis,
    });
    const e2 = await signEvent(signer, {
      id: "e2",
      recordId: "r1",
      type: "WITHDRAWN",
      actor: "u1",
      payload: { withdrawn_at: "2026-01-02T00:00:00.000Z" },
      prevEventHash: e1.outputHash,
      createdAt: "2026-01-02T00:00:00.000Z",
      inputHash: e1.outputHash,
    });
    expect(
      verifyEventChain(canonical, [
        { inputHash: genesis, outputHash: e1.outputHash, prevEventHash: null, type: "REGISTERED" },
        {
          inputHash: e1.outputHash,
          outputHash: e2.outputHash,
          prevEventHash: e1.outputHash,
          type: "WITHDRAWN",
        },
      ]).ok,
    ).toBe(true);
    expect(
      verifyEventChain(canonical, [
        { inputHash: "dead", outputHash: e1.outputHash, prevEventHash: null, type: "REGISTERED" },
      ]).ok,
    ).toBe(false);
  });
});

describe("declarations", () => {
  it("flags a declared date earlier than detected capture time", () => {
    const notes = declarationContradictions(
      { creation_date: "2019-01-01", ai_use: "none" },
      {
        timeline: [{ value: "2020-06-01T12:00:00Z", field: "exif:DateTimeOriginal" }],
        c2pa: { ai_assertion: "trainedAlgorithmicMedia" },
      },
    );
    expect(notes.length).toBeGreaterThan(0);
  });
});

describe("TSA query", () => {
  it("builds a DER TimeStampReq for a SHA-256 imprint", () => {
    const hash = recordHashFromCanonical("{}");
    const der = buildTimestampQuery(hash);
    expect(der[0]).toBe(0x30);
    expect(hash).toHaveLength(64);
  });
});

describe("verify headlines", () => {
  it("uses the required VR-3 wording and avoids authenticity headlines", () => {
    expect(VERIFY_HEADLINES.exact).toBe("This file matches the registered record");
    expect(VERIFY_HEADLINES.no_match).toBe("This file does not match this record");
    expect(VERIFY_HEADLINES.similar).toBe("Visually similar to a registered image");
    expect(VERIFY_HEADLINES.record_problem).toBe("This record cannot be relied on");
    const joined = Object.values(VERIFY_HEADLINES).join(" ");
    expect(joined).not.toMatch(/\bauthentic\b/i);
    expect(joined).not.toMatch(/\bgenuine\b/i);
    expect(joined).not.toMatch(/\bverified\b/i);
  });
});
