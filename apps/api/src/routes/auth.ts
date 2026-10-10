import { Hono } from "hono";
import { and, eq, gte, isNull } from "drizzle-orm";
import { CREDIT_DEFAULTS, ERROR_CODES, SESSION } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import {
  getDb,
  users,
  magicLinks,
  passwordResets,
  sessions,
  analysisJobs,
  assets,
  anonymousSessions,
  ensureWallet,
  grantSignupCredits,
} from "@oyokometa/db";
import { deleteCookie, getCookie } from "hono/cookie";
import { randomToken, sha256Hex, unsign } from "../crypto.js";
import { createUserSession } from "../session.js";
import {
  EmailDeliveryError,
  sendMagicLink,
  sendPasswordReset,
  sendVerifyEmail,
} from "../email.js";
import { publicAppOrigin } from "../origin.js";
import { audit } from "../audit.js";
import { allowEndpoint } from "../rate-limit.js";
import {
  hashPassword,
  isValidPassword,
  isValidUsername,
  MIN_PASSWORD,
  normalizeEmail,
  normalizeUsername,
  verifyAgainstDummy,
  verifyPassword,
} from "../password.js";

export const authRoutes = new Hono();

authRoutes.get("/me", async (c) => {
  const auth = c.get("auth");
  return c.json({
    user: auth.user,
    anonymous_session_id: auth.anon?.id ?? null,
  });
});

authRoutes.post("/auth/register", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`reg:${auth.ipHash}`, 8, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many sign-up attempts", auth.requestId), 429);
  }
  const body = await c.req.json<{ email?: string; username?: string; password?: string }>();
  const email = normalizeEmail(body.email ?? "");
  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter a valid email", auth.requestId), 400);
  }
  if (!isValidUsername(username)) {
    return c.json(
      apiError(
        ERROR_CODES.validation_error,
        "Username must start with a letter and use 3–30 letters, numbers or underscores",
        auth.requestId,
      ),
      400,
    );
  }
  if (!isValidPassword(password)) {
    return c.json(
      apiError(ERROR_CODES.validation_error, `Password must be at least ${MIN_PASSWORD} characters`, auth.requestId),
      400,
    );
  }
  const db = getDb();
  const [emailClash] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  const [nameClash] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (emailClash || nameClash) {
    return c.json(
      apiError(ERROR_CODES.conflict, "That email or username is already registered", auth.requestId),
      409,
    );
  }
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({
      email,
      username,
      passwordHash,
      displayName: username,
      role: adminEmail && email === adminEmail ? "admin" : "user",
    })
    .returning();
  if (!user) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create account", auth.requestId), 503);
  }
  await finishLogin(c, user);
  await grantSignupCredits(user.id, CREDIT_DEFAULTS.signupBonus);
  const raw = randomToken(32);
  await db.insert(magicLinks).values({
    email,
    tokenHash: sha256Hex(raw),
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  const url = `${publicAppOrigin()}/auth/callback?token=${raw}`;
  try {
    await sendVerifyEmail(email, url);
  } catch (err) {
    if (!(err instanceof EmailDeliveryError)) throw err;
  }
  await audit(user.id, "auth.register", email);
  return c.json({
    ok: true,
    user: publicUser(user),
    verification_sent: true,
    credits_granted: CREDIT_DEFAULTS.signupBonus,
  }, 201);
});

authRoutes.post("/auth/login", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`pw:${auth.ipHash}`, 12, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many sign-in attempts", auth.requestId), 429);
  }
  const body = await c.req.json<{ identifier?: string; password?: string }>();
  const identifier = (body.identifier ?? "").trim();
  const password = body.password ?? "";
  if (!identifier || !password) {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter your username or email, and a password", auth.requestId), 400);
  }
  const db = getDb();
  const email = identifier.includes("@") ? normalizeEmail(identifier) : null;
  const username = email ? null : normalizeUsername(identifier);
  const [user] = await db
    .select()
    .from(users)
    .where(email ? eq(users.email, email) : eq(users.username, username ?? ""))
    .limit(1);
  if (!user || user.deletedAt || !user.passwordHash) {
    await verifyAgainstDummy(password);
    return c.json(apiError(ERROR_CODES.unauthorized, "Email, username or password is not recognised", auth.requestId), 401);
  }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Email, username or password is not recognised", auth.requestId), 401);
  }
  await finishLogin(c, user);
  await audit(user.id, "auth.password_sign_in", user.email);
  return c.json({ ok: true, user: publicUser(user) });
});

authRoutes.post("/auth/password/forgot", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`pwf:${auth.ipHash}`, 6, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many reset attempts", auth.requestId), 429);
  }
  const body = await c.req.json<{ email?: string }>();
  const email = normalizeEmail(body.email ?? "");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(apiError(ERROR_CODES.validation_error, "Enter a valid email", auth.requestId), 400);
  }
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (user && !user.deletedAt) {
    const raw = randomToken(32);
    await db.insert(passwordResets).values({
      userId: user.id,
      tokenHash: sha256Hex(raw),
      expiresAt: new Date(Date.now() + 30 * 60_000),
    });
    const url = `${publicAppOrigin()}/auth/reset?token=${raw}`;
    try {
      await sendPasswordReset(email, url);
    } catch (err) {
      if (err instanceof EmailDeliveryError) {
        return c.json(apiError(ERROR_CODES.service_unavailable, "Could not send the reset email", auth.requestId), 503);
      }
      throw err;
    }
    await audit(user.id, "auth.password_reset_requested", email);
  }
  return c.json({ ok: true });
});

authRoutes.post("/auth/password/reset", async (c) => {
  const auth = c.get("auth");
  const body = await c.req.json<{ token?: string; password?: string }>();
  const token = body.token ?? "";
  const password = body.password ?? "";
  if (!token) return c.json(apiError(ERROR_CODES.validation_error, "Missing token", auth.requestId), 400);
  if (!isValidPassword(password)) {
    return c.json(
      apiError(ERROR_CODES.validation_error, `Password must be at least ${MIN_PASSWORD} characters`, auth.requestId),
      400,
    );
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(passwordResets)
    .where(and(eq(passwordResets.tokenHash, sha256Hex(token)), eq(passwordResets.purpose, "password_reset")))
    .limit(1);
  if (!row || row.consumedAt || row.expiresAt < new Date()) {
    return c.json(apiError(ERROR_CODES.unauthorized, "This reset link is invalid or expired", auth.requestId), 401);
  }
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  if (!user || user.deletedAt) {
    return c.json(apiError(ERROR_CODES.unauthorized, "This reset link is invalid or expired", auth.requestId), 401);
  }
  await db.update(passwordResets).set({ consumedAt: new Date() }).where(eq(passwordResets.id, row.id));
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await db
    .update(sessions)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(eq(sessions.userId, user.id));
  await finishLogin(c, user);
  await audit(user.id, "auth.password_reset", user.email);
  return c.json({ ok: true, user: publicUser(user) });
});

authRoutes.post("/auth/password", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  const body = await c.req.json<{ current?: string; next?: string }>();
  const next = body.next ?? "";
  if (!isValidPassword(next)) {
    return c.json(
      apiError(ERROR_CODES.validation_error, `Password must be at least ${MIN_PASSWORD} characters`, auth.requestId),
      400,
    );
  }
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (user.passwordHash) {
    const ok = await verifyPassword(body.current ?? "", user.passwordHash);
    if (!ok) {
      return c.json(apiError(ERROR_CODES.unauthorized, "Current password is not recognised", auth.requestId), 401);
    }
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await audit(user.id, "auth.password_changed", user.id);
  return c.json({ ok: true });
});

authRoutes.post("/auth/magic-link", async (c) => {
  const auth = c.get("auth");
  if (!allowEndpoint(`ml:${auth.ipHash}`, 8, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many sign-in attempts", auth.requestId), 429);
  }
  const body = await c.req.json<{ email?: string }>();
  const email = normalizeEmail(body.email ?? "");
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
  const url = `${publicAppOrigin()}/auth/callback?token=${raw}`;
  try {
    const sent = await sendMagicLink(email, url);
    await audit("system", "auth.magic_link", email);
    return c.json({
      ok: true,
      dev_link: sent.sent || process.env.NODE_ENV === "production" ? undefined : sent.url,
    });
  } catch (err) {
    if (err instanceof EmailDeliveryError) {
      return c.json(apiError(ERROR_CODES.service_unavailable, "Could not send the sign-in email", auth.requestId), 503);
    }
    throw err;
  }
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
  let created = false;
  if (!user) {
    const username = await allocateUsername(link.email.split("@")[0] ?? "user");
    const role = adminEmail && link.email === adminEmail ? "admin" : "user";
    [user] = await db
      .insert(users)
      .values({
        email: link.email,
        username,
        emailVerifiedAt: new Date(),
        displayName: username,
        role,
      })
      .returning();
    created = true;
  } else if (!user.emailVerifiedAt) {
    await db.update(users).set({ emailVerifiedAt: new Date(), updatedAt: new Date() }).where(eq(users.id, user.id));
    user = { ...user, emailVerifiedAt: new Date() };
  }
  if (!user) {
    return c.json(apiError(ERROR_CODES.service_unavailable, "Could not create account", auth.requestId), 503);
  }
  await finishLogin(c, user);
  if (created) await grantSignupCredits(user.id, CREDIT_DEFAULTS.signupBonus);
  await audit(user.id, "auth.sign_in", user.email);
  return c.json({ ok: true, user: publicUser(user) });
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

function publicUser(user: { id: string; email: string; username?: string | null; role: string; emailVerifiedAt?: Date | null }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username ?? null,
    role: user.role,
    email_verified: Boolean(user.emailVerifiedAt),
  };
}

async function allocateUsername(preferred: string) {
  const db = getDb();
  let base = normalizeUsername(preferred).replace(/[^a-z0-9_]/g, "");
  if (!isValidUsername(base)) base = `user_${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
  if (!base.startsWith("user") && !isValidUsername(base)) base = `u${base}`.slice(0, 30);
  if (!isValidUsername(base)) base = "user";
  for (let i = 0; i < 12; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 22)}_${randomToken(2).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 6)}`.slice(0, 30);
    if (!isValidUsername(candidate)) continue;
    const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.username, candidate)).limit(1);
    if (!clash) return candidate;
  }
  return `user_${randomToken(6).toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 12)}`;
}

async function finishLogin(
  c: Parameters<typeof createUserSession>[0],
  user: { id: string },
) {
  const auth = c.get("auth");
  const db = getDb();
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
}
