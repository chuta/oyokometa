import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;
const N = 16_384;
const R = 8;
const P = 1;

function scryptAsync(password: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, keylen, opts, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

export const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/;
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 200;

export function normalizeUsername(raw: string) {
  return raw.trim().toLowerCase();
}

export function normalizeEmail(raw: string) {
  return raw.trim().toLowerCase();
}

export function isValidUsername(raw: string) {
  return USERNAME_RE.test(normalizeUsername(raw));
}

export function isValidPassword(raw: string) {
  return raw.length >= MIN_PASSWORD && raw.length <= MAX_PASSWORD;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts[0] !== "scrypt" || parts.length !== 6) return false;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) return false;
  let salt: Buffer;
  let expect: Buffer;
  try {
    salt = Buffer.from(parts[4] ?? "", "base64url");
    expect = Buffer.from(parts[5] ?? "", "base64url");
  } catch {
    return false;
  }
  if (!salt.length || !expect.length) return false;
  const key = await scryptAsync(password, salt, expect.length, { N: n, r, p });
  if (key.length !== expect.length) return false;
  return timingSafeEqual(key, expect);
}

let dummyHash: string | null = null;
export async function verifyAgainstDummy(password: string) {
  dummyHash ??= await hashPassword("not-used-dummy-password");
  await verifyPassword(password, dummyHash);
}
