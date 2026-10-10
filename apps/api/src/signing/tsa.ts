import { createHash, randomBytes, webcrypto } from "node:crypto";
import * as asn1js from "asn1js";
import * as pkijs from "pkijs";

export type TimestampResult = {
  token: string;
  source: "rfc3161" | "platform_clock";
  hashed: string;
  gen_time: string;
};

const SHA256_OID = "2.16.840.1.101.3.4.2.1";
const SIGNED_DATA_OID = "1.2.840.113549.1.7.2";
const TST_INFO_OID = "1.2.840.113549.1.9.16.1.4";

let engineReady = false;
export function ensurePkiEngine() {
  if (engineReady) return;
  type EngineCrypto = ConstructorParameters<typeof pkijs.CryptoEngine>[0]["crypto"];
  pkijs.setEngine("oyokometa-node", new pkijs.CryptoEngine({ name: "node", crypto: webcrypto as unknown as EngineCrypto }));
  engineReady = true;
}

function ab(buf: Buffer | Uint8Array): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function tsaError(message: string) {
  return Object.assign(new Error(`tsa: ${message}`), { code: "service_unavailable" });
}

/** Positive 128-bit nonce with no leading zero byte, so its DER INTEGER form is the raw bytes. */
export function newNonce(): Buffer {
  const n = randomBytes(16);
  n[0] = (n[0]! & 0x7f) | 0x01;
  return n;
}

function stripLeadingZeros(b: Buffer) {
  let i = 0;
  while (i < b.length - 1 && b[i] === 0) i++;
  return b.subarray(i);
}

/** RFC 3161 TimeStampReq: SHA-256 imprint, nonce, and certReq so the response carries the TSA certificate. */
export function buildTimestampQuery(sha256Hex: string, nonce: Buffer = newNonce()): Buffer {
  const req = new pkijs.TimeStampReq({
    version: 1,
    messageImprint: new pkijs.MessageImprint({
      hashAlgorithm: new pkijs.AlgorithmIdentifier({ algorithmId: SHA256_OID, algorithmParams: new asn1js.Null() }),
      hashedMessage: new asn1js.OctetString({ valueHex: ab(Buffer.from(sha256Hex, "hex")) }),
    }),
    nonce: new asn1js.Integer({ valueHex: ab(nonce) }),
    certReq: true,
  });
  return Buffer.from(req.toSchema().toBER(false));
}

export type VerifiedTimestamp = { token: Buffer; genTime: Date; serial: string; policy: string };

/**
 * Accepts a TimeStampResp only if it was granted, covers exactly `data`, echoes our nonce,
 * and its CMS signature verifies against the certificate embedded in the token.
 */
export async function verifyTimestampResponse(der: Buffer, data: Buffer, nonce: Buffer): Promise<VerifiedTimestamp> {
  ensurePkiEngine();
  const asn = asn1js.fromBER(ab(der));
  if (asn.offset === -1) throw tsaError("malformed response");
  const resp = new pkijs.TimeStampResp({ schema: asn.result });
  const status = resp.status.status;
  if (status !== pkijs.PKIStatus.granted && status !== pkijs.PKIStatus.grantedWithMods) {
    throw tsaError(`request not granted (status ${status})`);
  }
  const token = resp.timeStampToken;
  if (!token || token.contentType !== SIGNED_DATA_OID) throw tsaError("missing timestamp token");
  const signed = new pkijs.SignedData({ schema: token.content });
  const eContent = signed.encapContentInfo.eContent;
  if (signed.encapContentInfo.eContentType !== TST_INFO_OID || !eContent) throw tsaError("token is not a TSTInfo");
  const tst = pkijs.TSTInfo.fromBER(eContent.getValue());

  if (tst.messageImprint.hashAlgorithm.algorithmId !== SHA256_OID) throw tsaError("unexpected imprint algorithm");
  const imprint = Buffer.from(tst.messageImprint.hashedMessage.valueBlock.valueHexView);
  if (!imprint.equals(createHash("sha256").update(data).digest())) throw tsaError("imprint does not match");
  const echoed = tst.nonce ? Buffer.from(tst.nonce.valueBlock.valueHexView) : null;
  if (!echoed || !stripLeadingZeros(echoed).equals(stripLeadingZeros(nonce))) throw tsaError("nonce mismatch");

  let verified = false;
  try {
    verified = await signed.verify({ signer: 0, data: ab(data), checkChain: false });
  } catch (err) {
    throw tsaError(`signature check failed: ${(err as { message?: string }).message ?? String(err)}`);
  }
  if (!verified) throw tsaError("signature does not verify");

  return {
    token: Buffer.from(token.toSchema().toBER(false)),
    genTime: tst.genTime,
    serial: Buffer.from(tst.serialNumber.valueBlock.valueHexView).toString("hex"),
    policy: tst.policy,
  };
}

/** Production never falls back to the platform clock: no verified timestamp means no record. */
export function timestampRequired(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV === "production";
}

export async function stampRecord(canonical: string): Promise<TimestampResult> {
  const data = Buffer.from(canonical, "utf8");
  const hashed = createHash("sha256").update(data).digest("hex");
  const url = process.env.TSA_URL;
  if (url) {
    const nonce = newNonce();
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/timestamp-query", Accept: "application/timestamp-reply" },
        body: buildTimestampQuery(hashed, nonce),
        signal: AbortSignal.timeout(Number(process.env.TSA_TIMEOUT_MS ?? 15_000)),
      });
    } catch (err) {
      throw tsaError(`request failed: ${String(err)}`);
    }
    if (!res.ok) throw tsaError(`http ${res.status}`);
    const verified = await verifyTimestampResponse(Buffer.from(await res.arrayBuffer()), data, nonce);
    return {
      token: verified.token.toString("base64"),
      source: "rfc3161",
      hashed,
      gen_time: verified.genTime.toISOString(),
    };
  }
  if (timestampRequired()) throw tsaError("TSA_URL is not configured");
  const time = new Date().toISOString();
  const assertion = {
    type: "platform_clock",
    note: "No RFC 3161 TSA configured. Registration time is Oyokometa's clock, not an independent timestamp.",
    time,
    record_hash: hashed,
  };
  return {
    token: Buffer.from(JSON.stringify(assertion)).toString("base64url"),
    source: "platform_clock",
    hashed,
    gen_time: time,
  };
}

export function recordHashFromCanonical(canonical: string) {
  return createHash("sha256").update(canonical).digest("hex");
}
