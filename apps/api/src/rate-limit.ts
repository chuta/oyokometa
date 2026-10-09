import { LIMITS } from "@oyokometa/config";

type Bucket = { n: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs = 86_400_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  if (b.n >= limit) return false;
  b.n += 1;
  return true;
}

export function allowAnonymousScan(sessionId: string, ipHash: string, signedIn: boolean) {
  if (signedIn) return rateLimit(`user:${sessionId}:scan`, LIMITS.signedInFreeScansPerDay);
  const sessionOk = rateLimit(`anon:${sessionId}:scan`, LIMITS.anonymousScansPerSessionPerDay);
  const ipOk = rateLimit(`ip:${ipHash}:scan`, LIMITS.anonymousScansPerIpPerDay);
  return sessionOk && ipOk;
}

export function allowEndpoint(key: string, limit = 60, windowMs = 60_000) {
  return rateLimit(key, limit, windowMs);
}
