import { eq } from "drizzle-orm";
import type { Context, Next } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { getDb, anonymousSessions, sessions, users } from "@oyokometa/db";
import { SESSION } from "@oyokometa/config";
import { hashIp, randomToken, sha256Hex, sign, unsign } from "./crypto.js";

export type AuthCtx = {
  requestId: string;
  ip: string;
  ipHash: string;
  anon: { id: string } | null;
  user: { id: string; email: string; username: string | null; emailVerified: boolean; role: string } | null;
};

declare module "hono" {
  interface ContextVariableMap {
    auth: AuthCtx;
  }
}

export async function sessionMiddleware(c: Context, next: Next) {
  const requestId = randomToken(8);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "127.0.0.1";
  const ipHash = hashIp(ip);
  const db = getDb();

  let user: AuthCtx["user"] = null;
  const userCookie = getCookie(c, SESSION.cookieName);
  if (userCookie) {
    const token = unsign(userCookie);
    if (token) {
      const [row] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.tokenHash, sha256Hex(token)))
        .limit(1);
      if (row && !row.revokedAt && row.expiresAt > new Date()) {
        const [u] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
        if (u && !u.deletedAt) {
          user = {
            id: u.id,
            email: u.email,
            username: u.username ?? null,
            emailVerified: Boolean(u.emailVerifiedAt),
            role: u.role,
          };
        }
      }
    }
  }

  let anon: AuthCtx["anon"] = null;
  let anonCookie = getCookie(c, SESSION.anonymousCookieName);
  const token = anonCookie ? unsign(anonCookie) : null;
  if (token) {
    const [row] = await db
      .select()
      .from(anonymousSessions)
      .where(eq(anonymousSessions.tokenHash, sha256Hex(token)))
      .limit(1);
    if (row && row.expiresAt > new Date()) anon = { id: row.id };
  }
  if (!anon) {
    const raw = randomToken(32);
    const expires = new Date(Date.now() + SESSION.ttlDays * 86400_000);
    const [created] = await db
      .insert(anonymousSessions)
      .values({
        tokenHash: sha256Hex(raw),
        expiresAt: expires,
        ipHash,
      })
      .returning();
    if (created) {
      anon = { id: created.id };
      setCookie(c, SESSION.anonymousCookieName, sign(raw), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        path: "/",
        expires,
      });
    }
  }

  c.set("auth", { requestId, ip, ipHash, anon, user });
  c.header("x-request-id", requestId);
  await next();
}

export function notFound(c: Context) {
  const id = c.get("auth")?.requestId ?? "unknown";
  return c.json({ error: { code: "not_found", message: "Not found", request_id: id } }, 404);
}

export async function createUserSession(c: Context, userId: string) {
  const db = getDb();
  const raw = randomToken(32);
  const expires = new Date(Date.now() + SESSION.ttlDays * 86400_000);
  await db.insert(sessions).values({
    userId,
    tokenHash: sha256Hex(raw),
    expiresAt: expires,
  });
  setCookie(c, SESSION.cookieName, sign(raw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    path: "/",
    expires,
  });
}
