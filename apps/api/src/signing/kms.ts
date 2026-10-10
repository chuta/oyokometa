import {
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign as nodeSign,
  verify as nodeVerify,
  type KeyObject,
} from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { canonicalJson } from "@oyokometa/shared";

export type PublishedKey = {
  kid: string;
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  alg: "ES256";
  use: "sig";
  status: "active" | "retired";
  valid_from: string;
  valid_until: string | null;
};

export interface KmsSigner {
  keyId: string;
  signPayload(payload: unknown): Promise<string>;
  verifyJws(jws: string): Promise<boolean>;
  publishedKey(): PublishedKey;
}

function b64urlJson(obj: unknown) {
  return Buffer.from(typeof obj === "string" ? obj : canonicalJson(obj)).toString("base64url");
}

export function parseJws(jws: string) {
  const [h, p, s] = jws.split(".");
  if (!h || !p || !s) throw new Error("malformed_jws");
  const header = JSON.parse(Buffer.from(h, "base64url").toString("utf8")) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(Buffer.from(p, "base64url").toString("utf8")) as unknown;
  return { header, payload, signingInput: `${h}.${p}`, signature: Buffer.from(s, "base64url") };
}

export class LocalPemSigner implements KmsSigner {
  readonly keyId: string;
  private readonly privateKey: KeyObject;
  private readonly publicKey: KeyObject;
  private readonly validFrom: string;

  constructor(pem: string, keyId: string, validFrom = new Date().toISOString()) {
    this.keyId = keyId;
    this.privateKey = createPrivateKey(pem);
    this.publicKey = createPublicKey(this.privateKey);
    this.validFrom = validFrom;
  }

  async signPayload(payload: unknown): Promise<string> {
    const header = { alg: "ES256", kid: this.keyId, typ: "JWS" };
    const h = Buffer.from(JSON.stringify(header)).toString("base64url");
    const p = b64urlJson(payload);
    const sig = nodeSign("SHA256", Buffer.from(`${h}.${p}`), {
      key: this.privateKey,
      dsaEncoding: "ieee-p1363",
    });
    return `${h}.${p}.${sig.toString("base64url")}`;
  }

  async verifyJws(jws: string): Promise<boolean> {
    try {
      const { header, signingInput, signature } = parseJws(jws);
      if (header.alg !== "ES256") return false;
      return nodeVerify(
        "SHA256",
        Buffer.from(signingInput),
        { key: this.publicKey, dsaEncoding: "ieee-p1363" },
        signature,
      );
    } catch {
      return false;
    }
  }

  publishedKey(): PublishedKey {
    const jwk = this.publicKey.export({ format: "jwk" });
    return {
      kid: this.keyId,
      kty: "EC",
      crv: "P-256",
      x: String(jwk.x),
      y: String(jwk.y),
      alg: "ES256",
      use: "sig",
      status: "active",
      valid_from: this.validFrom,
      valid_until: null,
    };
  }
}

export class AwsKmsSigner implements KmsSigner {
  readonly keyId: string;
  constructor(
    private readonly kmsKeyId: string,
    keyId: string,
    private readonly publicPem: string,
  ) {
    this.keyId = keyId;
  }

  async signPayload(payload: unknown): Promise<string> {
    const { KMSClient, SignCommand } = await import("@aws-sdk/client-kms");
    const header = { alg: "ES256", kid: this.keyId, typ: "JWS" };
    const h = Buffer.from(JSON.stringify(header)).toString("base64url");
    const p = b64urlJson(payload);
    const client = new KMSClient({ region: process.env.AWS_REGION ?? "eu-west-1" });
    const out = await client.send(
      new SignCommand({
        KeyId: this.kmsKeyId,
        Message: Buffer.from(`${h}.${p}`),
        MessageType: "RAW",
        SigningAlgorithm: "ECDSA_SHA_256",
      }),
    );
    if (!out.Signature) throw new Error("kms_sign_failed");
    const ieee = derEcdsaToJose(Buffer.from(out.Signature), 32);
    return `${h}.${p}.${ieee.toString("base64url")}`;
  }

  async verifyJws(jws: string): Promise<boolean> {
    const pub = createPublicKey(this.publicPem);
    try {
      const { header, signingInput, signature } = parseJws(jws);
      if (header.alg !== "ES256") return false;
      return nodeVerify(
        "SHA256",
        Buffer.from(signingInput),
        { key: pub, dsaEncoding: "ieee-p1363" },
        signature,
      );
    } catch {
      return false;
    }
  }

  publishedKey(): PublishedKey {
    const jwk = createPublicKey(this.publicPem).export({ format: "jwk" });
    return {
      kid: this.keyId,
      kty: "EC",
      crv: "P-256",
      x: String(jwk.x),
      y: String(jwk.y),
      alg: "ES256",
      use: "sig",
      status: "active",
      valid_from: process.env.SIGNING_KEY_VALID_FROM ?? new Date().toISOString(),
      valid_until: null,
    };
  }
}

/** Convert RFC 3279 DER ECDSA signature to JWS IEEE-P1363. */
export function derEcdsaToJose(der: Buffer, size: number): Buffer {
  let i = 0;
  if (der[i++] !== 0x30) throw new Error("der");
  i += der[i]! >= 0x80 ? (der[i++]! & 0x7f) : 1;
  if (der[i++] !== 0x02) throw new Error("der");
  const rLen = der[i++]!;
  let r = der.subarray(i, i + rLen);
  i += rLen;
  if (der[i++] !== 0x02) throw new Error("der");
  const sLen = der[i++]!;
  let s = der.subarray(i, i + sLen);
  if (r[0] === 0) r = r.subarray(1);
  if (s[0] === 0) s = s.subarray(1);
  const out = Buffer.alloc(size * 2);
  r.copy(out, size - r.length);
  s.copy(out, size * 2 - s.length);
  return out;
}

function devPemPath() {
  return join(process.env.FS_STORAGE_DIR ?? "./data/storage", "..", "signing-dev.pem");
}

function loadOrCreateDevPem(): string {
  const fromEnv = process.env.SIGNING_PRIVATE_KEY_PEM?.replace(/\\n/g, "\n");
  if (fromEnv) return fromEnv;
  const path = devPemPath();
  if (existsSync(path)) return readFileSync(path, "utf8");
  const pair = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const pem = pair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, pem, { mode: 0o600 });
  return pem;
}

let _signer: KmsSigner | null = null;

export type SignerMode = "kms" | "env_pem" | "dev_file";

/** Production signs with KMS; an env PEM is accepted only while SIGNING_ALLOW_ENV_KEY=true. */
export function signerMode(env: NodeJS.ProcessEnv = process.env): SignerMode {
  if (env.AWS_KMS_KEY_ID && env.SIGNING_PUBLIC_KEY_PEM) return "kms";
  if (env.NODE_ENV === "production") {
    if (env.SIGNING_ALLOW_ENV_KEY !== "true") {
      throw new Error(
        "Production signing requires AWS KMS (AWS_KMS_KEY_ID and SIGNING_PUBLIC_KEY_PEM). " +
          "SIGNING_ALLOW_ENV_KEY=true permits an env PEM as a temporary exception.",
      );
    }
    if (!env.SIGNING_PRIVATE_KEY_PEM) throw new Error("SIGNING_PRIVATE_KEY_PEM is required when SIGNING_ALLOW_ENV_KEY=true");
    return "env_pem";
  }
  return env.SIGNING_PRIVATE_KEY_PEM ? "env_pem" : "dev_file";
}

export function getSigner(): KmsSigner {
  if (_signer) return _signer;
  const kid = process.env.SIGNING_KEY_ID ?? "okm-dev-1";
  const validFrom = process.env.SIGNING_KEY_VALID_FROM;
  const mode = signerMode();
  if (mode === "kms") {
    _signer = new AwsKmsSigner(
      process.env.AWS_KMS_KEY_ID!,
      kid,
      process.env.SIGNING_PUBLIC_KEY_PEM!.replace(/\\n/g, "\n"),
    );
    return _signer;
  }
  if (mode === "env_pem" && process.env.NODE_ENV === "production") {
    console.warn(JSON.stringify({ msg: "signing_env_key_exception", kid }));
  }
  _signer = new LocalPemSigner(loadOrCreateDevPem(), kid, validFrom);
  return _signer;
}

export function retiredKeys(env: NodeJS.ProcessEnv = process.env): PublishedKey[] {
  if (!env.SIGNING_RETIRED_KEYS_JSON) return [];
  try {
    const parsed = JSON.parse(env.SIGNING_RETIRED_KEYS_JSON) as unknown;
    return Array.isArray(parsed) ? (parsed as PublishedKey[]) : [];
  } catch {
    console.error(JSON.stringify({ msg: "signing_retired_keys_invalid_json" }));
    return [];
  }
}

/** Public half of a PEM key, in the shape published under `retired` in oyokometa-keys.json. */
export function retiredKeyFromPem(pem: string, kid: string, validFrom: string, validUntil: string): PublishedKey {
  const jwk = createPublicKey(createPrivateKey(pem)).export({ format: "jwk" });
  return {
    kid,
    kty: "EC",
    crv: "P-256",
    x: String(jwk.x),
    y: String(jwk.y),
    alg: "ES256",
    use: "sig",
    status: "retired",
    valid_from: validFrom,
    valid_until: validUntil,
  };
}

/** Records keep verifying after rotation: pick the key named by the record, current or retired. */
export async function verifyRecordSignature(jws: string, kid: string): Promise<boolean> {
  let header: { alg?: string; kid?: string };
  try {
    header = parseJws(jws).header;
  } catch {
    return false;
  }
  if (header.kid && header.kid !== kid) return false;
  const signer = getSigner();
  if (kid === signer.keyId) return signer.verifyJws(jws);
  const key = retiredKeys().find((k) => k.kid === kid);
  if (!key) return false;
  try {
    const { signingInput, signature } = parseJws(jws);
    if (header.alg !== "ES256") return false;
    const pub = createPublicKey({ key: { kty: "EC", crv: "P-256", x: key.x, y: key.y }, format: "jwk" });
    return nodeVerify("SHA256", Buffer.from(signingInput), { key: pub, dsaEncoding: "ieee-p1363" }, signature);
  } catch {
    return false;
  }
}

export function resetSignerForTests() {
  _signer = null;
}
