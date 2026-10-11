import { Hono } from "hono";
import { fulfilBachsEvent } from "../bachs-fulfil.js";
import { verifyBachsSignature } from "../bachs.js";

export const bachsWebhookRoutes = new Hono();

bachsWebhookRoutes.post("/webhooks/bachs", async (c) => {
  const secret = process.env.BACHS_WEBHOOK_SECRET?.trim() ?? "";
  if (!secret) {
    console.error(JSON.stringify({ msg: "bachs_webhook_secret_missing" }));
    return c.json({ error: "unavailable" }, 500);
  }
  const raw = await c.req.text();
  const ok = verifyBachsSignature({
    rawBody: raw,
    secret,
    signatureV2: c.req.header("x-bachs-signature-v2"),
    signatureV1: c.req.header("x-bachs-signature"),
    timestampV1: c.req.header("x-bachs-timestamp"),
  });
  if (!ok) return c.json({ error: "invalid_signature" }, 400);

  let event: { id?: unknown; type?: unknown; data?: unknown };
  try {
    event = JSON.parse(raw) as { id?: unknown; type?: unknown; data?: unknown };
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  if (typeof event.id !== "string" || typeof event.type !== "string") {
    return c.json({ error: "invalid_event" }, 400);
  }

  try {
    const result = await fulfilBachsEvent(event);
    if (result === "retry") return c.json({ error: "retry" }, 500);
    return c.json({ ok: true });
  } catch (err) {
    console.error(JSON.stringify({ msg: "bachs_webhook_failed", message: (err as Error).message }));
    return c.json({ error: "retry" }, 500);
  }
});
