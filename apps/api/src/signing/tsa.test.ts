import { createHash, webcrypto } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildTimestampQuery,
  ensurePkiEngine,
  newNonce,
  stampRecord,
  verifyTimestampResponse,
} from "./tsa.js";

const SHA256_OID = "2.16.840.1.101.3.4.2.1";

function ab(b: Buffer | Uint8Array) {
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
}

async function fakeTsa(
  data: Buffer,
  nonce: Buffer,
  opts: { status?: number; tamperImprint?: boolean; tamperSignature?: boolean } = {},
) {
  ensurePkiEngine();
  if (opts.status && opts.status >= 2) {
    const resp = new pkijs.TimeStampResp({ status: new pkijs.PKIStatusInfo({ status: opts.status }) });
    return Buffer.from(resp.toSchema().toBER(false));
  }
  const keys = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const cert = new pkijs.Certificate();
  cert.version = 2;
  cert.serialNumber = new asn1js.Integer({ value: 1 });
  const cn = new pkijs.AttributeTypeAndValue({ type: "2.5.4.3", value: new asn1js.Utf8String({ value: "Test TSA" }) });
  cert.issuer.typesAndValues.push(cn);
  cert.subject.typesAndValues.push(cn);
  cert.notBefore.value = new Date(Date.now() - 86400_000);
  cert.notAfter.value = new Date(Date.now() + 86400_000);
  const eku = new pkijs.ExtKeyUsage({ keyPurposes: ["1.3.6.1.5.5.7.3.8"] });
  cert.extensions = [
    new pkijs.Extension({
      extnID: "2.5.29.37",
      critical: true,
      extnValue: eku.toSchema().toBER(false),
      parsedValue: eku,
    }),
  ];
  await cert.subjectPublicKeyInfo.importKey(keys.publicKey);
  await cert.sign(keys.privateKey, "SHA-256");

  const digest = createHash("sha256").update(opts.tamperImprint ? Buffer.from("other") : data).digest();
  const tst = new pkijs.TSTInfo({
    version: 1,
    policy: "1.3.6.1.4.1.99999.1",
    messageImprint: new pkijs.MessageImprint({
      hashAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: SHA256_OID }),
      hashedMessage: new asn1js.OctetString({ valueHex: ab(digest) }),
    }),
    serialNumber: new asn1js.Integer({ value: 42 }),
    genTime: new Date("2026-10-09T10:00:00Z"),
    nonce: new asn1js.Integer({ valueHex: ab(nonce) }),
  });
  const signed = new pkijs.SignedData({
    version: 3,
    encapContentInfo: new pkijs.EncapsulatedContentInfo({
      eContentType: "1.2.840.113549.1.9.16.1.4",
      eContent: new asn1js.OctetString({ valueHex: tst.toSchema().toBER(false) }),
    }),
    signerInfos: [
      new pkijs.SignerInfo({
        version: 1,
        sid: new pkijs.IssuerAndSerialNumber({ issuer: cert.issuer, serialNumber: cert.serialNumber }),
      }),
    ],
    certificates: [cert],
  });
  // Real TSAs emit DER (primitive OCTET STRING); pkijs' constructor would otherwise chunk it as BER.
  signed.encapContentInfo.eContent = new asn1js.OctetString({ valueHex: tst.toSchema().toBER(false) });
  await signed.sign(keys.privateKey, 0, "SHA-256");
  if (opts.tamperSignature) {
    const sig = signed.signerInfos[0]!.signature.valueBlock.valueHexView;
    sig[sig.length - 1] = sig[sig.length - 1]! ^ 0xff;
  }
  const resp = new pkijs.TimeStampResp({
    status: new pkijs.PKIStatusInfo({ status: pkijs.PKIStatus.granted }),
    timeStampToken: new pkijs.ContentInfo({ contentType: "1.2.840.113549.1.7.2", content: signed.toSchema(true) }),
  });
  return Buffer.from(resp.toSchema().toBER(false));
}

describe("RFC 3161 timestamps", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("builds a request with imprint, nonce and certReq", () => {
    const nonce = newNonce();
    const hash = createHash("sha256").update("{}").digest("hex");
    const req = pkijs.TimeStampReq.fromBER(ab(buildTimestampQuery(hash, nonce)));
    expect(Buffer.from(req.messageImprint.hashedMessage.valueBlock.valueHexView).toString("hex")).toBe(hash);
    expect(Buffer.from(req.nonce!.valueBlock.valueHexView).equals(nonce)).toBe(true);
    expect(req.certReq).toBe(true);
  });

  it("accepts a granted, signed token for our data and nonce", async () => {
    const data = Buffer.from('{"a":1}');
    const nonce = newNonce();
    const v = await verifyTimestampResponse(await fakeTsa(data, nonce), data, nonce);
    expect(v.genTime.toISOString()).toBe("2026-10-09T10:00:00.000Z");
    expect(v.serial).toBe("2a");
    expect(v.token.length).toBeGreaterThan(100);
  });

  it("rejects a token for different data", async () => {
    const data = Buffer.from('{"a":1}');
    const nonce = newNonce();
    await expect(verifyTimestampResponse(await fakeTsa(data, nonce, { tamperImprint: true }), data, nonce)).rejects.toThrow(
      /imprint/,
    );
  });

  it("rejects a replayed token with another nonce", async () => {
    const data = Buffer.from('{"a":1}');
    await expect(verifyTimestampResponse(await fakeTsa(data, newNonce()), data, newNonce())).rejects.toThrow(/nonce/);
  });

  it("rejects a bad signature", async () => {
    const data = Buffer.from('{"a":1}');
    const nonce = newNonce();
    await expect(
      verifyTimestampResponse(await fakeTsa(data, nonce, { tamperSignature: true }), data, nonce),
    ).rejects.toThrow(/signature/);
  });

  it("rejects a refused request", async () => {
    const data = Buffer.from('{"a":1}');
    const nonce = newNonce();
    await expect(verifyTimestampResponse(await fakeTsa(data, nonce, { status: 2 }), data, nonce)).rejects.toThrow(
      /not granted/,
    );
  });

  it("refuses to fall back to the platform clock in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TSA_URL", "");
    await expect(stampRecord("{}")).rejects.toMatchObject({ code: "service_unavailable" });
  });

  it("uses the platform clock outside production when no TSA is set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TSA_URL", "");
    await expect(stampRecord("{}")).resolves.toMatchObject({ source: "platform_clock" });
  });

  it("stamps through the configured TSA and verifies the reply", async () => {
    vi.stubEnv("TSA_URL", "https://tsa.test/");
    vi.stubGlobal("fetch", async (_url: string, init: { body: Buffer }) => {
      const req = pkijs.TimeStampReq.fromBER(ab(init.body));
      const nonce = Buffer.from(req.nonce!.valueBlock.valueHexView);
      return new Response(await fakeTsa(Buffer.from('{"b":2}'), nonce), { status: 200 });
    });
    const res = await stampRecord('{"b":2}');
    expect(res.source).toBe("rfc3161");
    expect(res.gen_time).toBe("2026-10-09T10:00:00.000Z");
  });
});
