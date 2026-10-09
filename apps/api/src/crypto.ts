import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function sha256Hex(s: string | Buffer) {
  return createHash("sha256").update(s).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sign(value: string, secret = process.env.SESSION_SECRET ?? "dev-secret") {
  const h = createHmac("sha256", secret).update(value).digest("base64url");
  return `${value}.${h}`;
}

export function unsign(signed: string, secret = process.env.SESSION_SECRET ?? "dev-secret") {
  const i = signed.lastIndexOf(".");
  if (i < 0) return null;
  const value = signed.slice(0, i);
  const mac = signed.slice(i + 1);
  const expect = createHmac("sha256", secret).update(value).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return value;
}

export function hashIp(ip: string) {
  return sha256Hex(`ip:${ip}`);
}
