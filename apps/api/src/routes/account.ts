import { Hono } from "hono";
import { and, eq, isNull } from "drizzle-orm";
import { deleteCookie } from "hono/cookie";
import { ERROR_CODES, SESSION } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import { getDb, passwordResets, users } from "@oyokometa/db";
import { allowEndpoint } from "../rate-limit.js";
import { randomToken, sha256Hex } from "../crypto.js";
import { verifyPassword } from "../password.js";
import { publicAppOrigin } from "../origin.js";
import { EmailDeliveryError, sendAccountDeletionLink } from "../email.js";
import { audit } from "../audit.js";
import { DELETION_CONFIRM_WORD, eraseAccount } from "../account-deletion.js";

export const accountRoutes = new Hono();

const PURPOSE = "account_deletion";

accountRoutes.post("/account/delete/email-link", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (!allowEndpoint(`acdl:${auth.user.id}`, 3, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many requests", auth.requestId), 429);
  }
  const raw = randomToken(32);
  await getDb().insert(passwordResets).values({
    userId: auth.user.id,
    tokenHash: sha256Hex(raw),
    purpose: PURPOSE,
    expiresAt: new Date(Date.now() + 30 * 60_000),
  });
  const url = `${publicAppOrigin()}/account/delete?token=${raw}`;
  try {
    const sent = await sendAccountDeletionLink(auth.user.email, url);
    await audit(auth.user.id, "account.deletion_link_sent", auth.user.id);
    return c.json({ ok: true, dev_link: sent.sent || process.env.NODE_ENV === "production" ? undefined : sent.url });
  } catch (err) {
    if (err instanceof EmailDeliveryError) {
      return c.json(apiError(ERROR_CODES.service_unavailable, "Could not send the confirmation email", auth.requestId), 503);
    }
    throw err;
  }
});

accountRoutes.post("/account/delete", async (c) => {
  const auth = c.get("auth");
  if (!auth.user) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }
  if (!allowEndpoint(`acd:${auth.user.id}`, 5, 3_600_000)) {
    return c.json(apiError(ERROR_CODES.rate_limited, "Too many attempts", auth.requestId), 429);
  }
  const body = await c.req
    .json<{ confirm?: string; password?: string; token?: string }>()
    .catch(() => ({}) as { confirm?: string; password?: string; token?: string });
  if (body.confirm !== DELETION_CONFIRM_WORD) {
    return c.json(
      apiError(ERROR_CODES.validation_error, `Type ${DELETION_CONFIRM_WORD} to confirm`, auth.requestId),
      400,
    );
  }
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, auth.user.id)).limit(1);
  if (!user || user.deletedAt) {
    return c.json(apiError(ERROR_CODES.unauthorized, "Sign in required", auth.requestId), 401);
  }

  let reauthenticated = false;
  if (body.token) {
    const [row] = await db
      .select()
      .from(passwordResets)
      .where(
        and(
          eq(passwordResets.tokenHash, sha256Hex(body.token)),
          eq(passwordResets.purpose, PURPOSE),
          eq(passwordResets.userId, user.id),
          isNull(passwordResets.consumedAt),
        ),
      )
      .limit(1);
    if (row && row.expiresAt > new Date()) {
      await db.update(passwordResets).set({ consumedAt: new Date() }).where(eq(passwordResets.id, row.id));
      reauthenticated = true;
    }
  } else if (body.password && user.passwordHash) {
    reauthenticated = await verifyPassword(body.password, user.passwordHash);
  }
  if (!reauthenticated) {
    await audit(user.id, "account.deletion_reauth_failed", user.id);
    return c.json(
      apiError(
        ERROR_CODES.unauthorized,
        body.token ? "This confirmation link is invalid or expired" : "Password is not recognised",
        auth.requestId,
      ),
      401,
    );
  }

  const result = await eraseAccount(user.id);
  deleteCookie(c, SESSION.cookieName, { path: "/" });
  return c.json({ ok: true, ...result });
});
