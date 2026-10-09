import { createHash } from "node:crypto";

export type TimestampResult = {
  token: string;
  source: "rfc3161" | "platform_clock";
  hashed: string;
};

/** RFC 3161 TimeStampReq (SHA-256 imprint). MessageImprint only; nonce omitted. */
export function buildTimestampQuery(sha256Hex: string): Buffer {
  const imprint = Buffer.from(sha256Hex, "hex");
  const oidSha256 = Buffer.from("0609608648016503040201", "hex");
  const algo = Buffer.concat([
    Buffer.from([0x30, oidSha256.length + 4, ...oidSha256, 0x05, 0x00]),
  ]);
  algo[1] = oidSha256.length + 4;
  const octet = Buffer.concat([Buffer.from([0x04, imprint.length]), imprint]);
  const messageImprint = wrap(0x30, Buffer.concat([algo, octet]));
  const version = Buffer.from([0x02, 0x01, 0x01]);
  return wrap(0x30, Buffer.concat([version, messageImprint]));
}

function wrap(tag: number, inner: Buffer) {
  if (inner.length < 128) return Buffer.concat([Buffer.from([tag, inner.length]), inner]);
  const len = Buffer.alloc(3);
  len[0] = 0x82;
  len.writeUInt16BE(inner.length, 1);
  return Buffer.concat([Buffer.from([tag]), len, inner]);
}

export async function stampRecordHash(sha256Hex: string): Promise<TimestampResult> {
  const url = process.env.TSA_URL;
  if (url) {
    const body = buildTimestampQuery(sha256Hex);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/timestamp-query" },
      body,
    });
    if (!res.ok) throw new Error(`tsa_http_${res.status}`);
    const token = Buffer.from(await res.arrayBuffer()).toString("base64");
    return { token, source: "rfc3161", hashed: sha256Hex };
  }
  const assertion = {
    type: "platform_clock",
    note: "No RFC 3161 TSA configured. Registration time is Oyokometa's clock, not an independent timestamp.",
    time: new Date().toISOString(),
    record_hash: sha256Hex,
  };
  return { token: Buffer.from(JSON.stringify(assertion)).toString("base64url"), source: "platform_clock", hashed: sha256Hex };
}

export function recordHashFromCanonical(canonical: string) {
  return createHash("sha256").update(canonical).digest("hex");
}
