import { Hono } from "hono";
import { and, eq, gte, isNull } from "drizzle-orm";
import { ERROR_CODES, SESSION } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  getDb,
  users,
  magicLinks,
  sessions,
  analysisJobs,
  assets,
  anonymousSessions,
  ensureWallet,
} from "@oyokometa/db";
import { deleteCookie, getCookie } from "hono/cookie";
import { randomToken, sha256Hex, unsign } from "../crypto.js";
import { createUserSession } from "../session.js";
import { sendMagicLink } from "../email.js";
import { audit } from "../audit.js";
import { allowEndpoint } from "../rate-limit.js";

export const authRoutes = new Hono();

authRoutes.get("/me", async (c) => {
  const auth = c.get("auth");
  return c.json({
    user: auth.user,
    anonymous_session_id: auth.anon?.id ?? null,
  });
});

authRoutes.post("/auth/magic-link", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`ml:${auth.ipHash}`, 8, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many sign-in attempts", auth.requestId), 429);
  }
  const body = await c.req.json<{ email?: string }>();
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter a valid email", auth.requestId), 400);
  }
  const raw = randomToken(32);
  const db = getDb();
  await db.insert(magicLinks).values({
    email,
    tokenHash: sha256Hex(raw),
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });
  const origin = process.env.WEB_ORIGIN ?? "http://localhost:3000";
  const url = `${origin}/auth/callback?token=${raw}`;
  const sent = await sendMagicLink(email, url);
  await audit("system", "auth.magic_link", email);
  return c.json({
    ok: true,
    dev_link: process.env.NODE_ENV === "production" ? undefined : sent.url,
  });
});

authRoutes.post("/auth/consume", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json<{ token?: string }>();
  const token = body.token;
  if (!token) return c.json(apiError(ERROR_CODES.validation_error, "Missing token", auth.requestId), 400);
  const db = getDb();
  const [link] = await db
    .select()
    .from(magicLinks)
    .where(eq(magicLinks.tokenHash, sha256Hex(token)))
    .limit(1);
  if (!link || link.consumedAt || link.expiresAt < new Date()) {
    return c.json(apiError(ERROR_CODES.unauthorized, "This sign-in link is invalid or expired", auth.requestId), 401);
  }
  await db.update(magicLinks).set({ consumedAt: new Date() }).where(eq(magicLinks.id, link.id));

  let [user] = await db.select().from(users).where(eq(users.email, link.email)).limit(1);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!user) {
    const role = adminEmail && link.email === adminEmail ? "admin" : "user";
    [user] = await db
      .insert(users)
      .values({
        email: link.email,
        emailVerifiedAt: new Date(),
        displayName: link.email.split("@")[0],
        role,
      })
      .returning();
  } else if (!user.emailVerifiedAt) {
    await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user!.id));
  }
  if (!user) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create account", auth.requestId), 503);
  }
  await ensureWallet(user.id);
  if (auth.anon) {
    const cutoff = new Date(Date.now() - 24 * 3600_000);
    await db
      .update(analysisJobs)
      .set({ ownerUserId: user.id, ownerSessionId: null, updatedAt: new Date() })
      .where(
        and(
          eq(analysisJobs.ownerSessionId, auth.anon.id),
          isNull(analysisJobs.ownerUserId),
          gte(analysisJobs.createdAt, cutoff),
        ),
      );
    await db
      .update(assets)
      .set({ ownerUserId: user.id, ownerSessionId: null, updatedAt: new Date() })
      .where(and(eq(assets.ownerSessionId, auth.anon.id), isNull(assets.ownerUserId)));
    await db
      .update(anonymousSessions)
      .set({ linkedUserId: user.id, updatedAt: new Date() })
      .where(eq(anonymousSessions.id, auth.anon.id));
  }
  await createUserSession(c, user.id);
  await audit(user.id, "auth.sign_in", user.email);
  return c.json({ ok: true, user: { id: user.id, email: user.email, role: user.role } });
});

authRoutes.post("/auth/logout", async (c) => {
  const cookie = getCookie(c, SESSION.cookieName);
  const db = getDb();
  if (cookie) {
    const token = unsign(cookie);
    if (token) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(sessions.tokenHash, sha256Hex(token)));
    }
  }
  deleteCookie(c, SESSION.cookieName, { path: "/" });
  return c.json({ ok: true });
});

authRoutes.post("/auth/sign-out-everywhere", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const db = getDb();
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(sessions.userId, auth.user.id));
  deleteCookie(c, SESSION.cookieName, { path: "/" });
  await audit(auth.user.id, "auth.sign_out_everywhere", auth.user.id);
  return c.json({ ok: true });
});
