import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { ERROR_CODES } from "@oyokometa/config";
import { apiError } from "@oyokometa/shared";
import { sessionMiddleware } from "./session.js";
import { uploadRoutes } from "./routes/uploads.js";
import { analysisRoutes } from "./routes/analyses.js";
import { authRoutes } from "./routes/auth.js";
import { creditRoutes } from "./routes/payments.js";
import { reportRoutes } from "./routes/reports.js";
import { shareRoutes } from "./routes/share.js";
import { adminRoutes } from "./routes/admin.js";
import { provenanceRoutes } from "./routes/provenance.js";
import { disputeRoutes } from "./routes/disputes.js";
import { getSigner } from "./signing/kms.js";

const app = new Hono();
const origins = (process.env.WEB_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: origins.length > 1 ? origins : origins[0] ?? "*",
    credentials: true,
    allowHeaders: ["Content-Type", "Idempotency-Key", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use("/api/v1/*", sessionMiddleware);

app.get("/health", (c) => c.json({ ok: true, service: "oyokometa-api" }));

app.get("/.well-known/oyokometa-keys.json", (c) => {
  const signer = getSigner();
  const retired = process.env.SIGNING_RETIRED_KEYS_JSON
    ? (JSON.parse(process.env.SIGNING_RETIRED_KEYS_JSON) as unknown[])
    : [];
  return c.json({
    issuer: process.env.API_PUBLIC_URL ?? origins[0] ?? "http://localhost:3000",
    credential_type: "platform_signed_record",
    keys: [signer.publishedKey()],
    retired,
  });
});

const v1 = new Hono();
v1.route("/", uploadRoutes);
v1.route("/", analysisRoutes);
v1.route("/", authRoutes);
v1.route("/", creditRoutes);
v1.route("/", reportRoutes);
v1.route("/", shareRoutes);
v1.route("/", adminRoutes);
v1.route("/", provenanceRoutes);
v1.route("/", disputeRoutes);
v1.notFound((c) =>
  c.json(apiError(ERROR_CODES.not_found, "Not found", c.get("auth")?.requestId ?? "unknown"), 404),
);
app.route("/api/v1", v1);

app.onError((err, c) => {
  console.error(err);
  const id = c.get("auth")?.requestId ?? "unknown";
  return c.json(apiError(ERROR_CODES.service_unavailable, "Service unavailable", id), 503);
});

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 4000);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, () => {
  console.log(JSON.stringify({ msg: "api_listen", port, hostname: "0.0.0.0" }));
});

export { app };
