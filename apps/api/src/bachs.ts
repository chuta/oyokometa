import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function bachsApiBase(apiKey: string): string {
  if (apiKey.startsWith("sk_sandbox_")) return "https://sandbox-api.bachs.io";
  if (apiKey.startsWith("sk_live_")) return "https://api.bachs.io";
  throw new Error("BACHS_API_KEY must start with sk_sandbox_ or sk_live_");
}

/** Bachs money is a decimal string at currency precision. Never send minor units. */
export function minorToDecimal(minor: number): string {
  if (!Number.isInteger(minor) || minor < 0) throw new Error("invalid amount");
  const whole = Math.floor(minor / 100);
  const frac = minor % 100;
  return `${whole}.${String(frac).padStart(2, "0")}`;
}

export function decimalToMinor(amount: string): number | null {
  if (!/^\d+\.\d{2}$/.test(amount)) return null;
  const [whole, frac] = amount.split(".");
  const minor = Number(whole) * 100 + Number(frac);
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

export function isPublicReturnUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (host === "0.0.0.0" || host === "::1" || host === "[::1]") return false;
  if (/^127\./.test(host)) return false;
  if (/^10\./.test(host) || /^192\.168\./.test(host)) return false;
  const private172 = /^172\.(\d+)\./.exec(host);
  if (private172) {
    const octet = Number(private172[1]);
    if (octet >= 16 && octet <= 31) return false;
  }
  return true;
}

export function verifyBachsSignature(input: {
  rawBody: string;
  secret: string;
  signatureV2: string | undefined;
  signatureV1: string | undefined;
  timestampV1: string | undefined;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): boolean {
  const now = input.nowSeconds ?? Date.now() / 1000;
  const tolerance = input.toleranceSeconds ?? 300;
  if (!input.secret) return false;
  if (input.signatureV2) return verifyV2(input.signatureV2, input.rawBody, input.secret, now, tolerance);
  if (input.signatureV1 && input.timestampV1) {
    return digestMatches(input.timestampV1, input.rawBody, input.secret, [input.signatureV1], now, tolerance);
  }
  return false;
}

function verifyV2(header: string, rawBody: string, secret: string, now: number, tolerance: number): boolean {
  const parts: Array<[string, string]> = [];
  for (const piece of header.split(",")) {
    const eq = piece.indexOf("=");
    if (eq <= 0) continue;
    parts.push([piece.slice(0, eq), piece.slice(eq + 1)]);
  }
  const timestamp = parts.find(([key]) => key === "t")?.[1];
  const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value);
  if (!timestamp) return false;
  return digestMatches(timestamp, rawBody, secret, signatures, now, tolerance);
}

function digestMatches(
  timestamp: string,
  rawBody: string,
  secret: string,
  signatures: string[],
  now: number,
  tolerance: number,
): boolean {
  if (!/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > tolerance) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
  const expectedBuf = Buffer.from(expected);
  return signatures.some((signature) => {
    const actual = Buffer.from(signature);
    if (actual.length !== expectedBuf.length) return false;
    return timingSafeEqual(expectedBuf, actual);
  });
}

export type BachsFulfilment =
  | { kind: "grant"; paymentId: string; checkoutId: string | null; chargeId: string | null; status: string; amount: string | null; currency: string | null }
  | { kind: "expire"; paymentId: string; checkoutId: string | null }
  | { kind: "reverse"; chargeId: string }
  | { kind: "ignore" };

type EventData = Record<string, unknown>;

export function classifyBachsEvent(event: { type?: unknown; data?: unknown }): BachsFulfilment {
  const type = typeof event.type === "string" ? event.type : "";
  const data = event.data && typeof event.data === "object" ? (event.data as EventData) : {};
  if (type === "collection.succeeded") {
    const paymentId = paymentIdFrom(data);
    if (!paymentId) return { kind: "ignore" };
    return {
      kind: "grant",
      paymentId,
      checkoutId: text(data, "checkout_id"),
      chargeId: text(data, "charge_id"),
      status: (text(data, "status") ?? "").toUpperCase(),
      amount: text(data, "amount"),
      currency: text(data, "currency")?.toUpperCase() ?? null,
    };
  }
  if (type === "checkout.expired") {
    const paymentId = paymentIdFrom(data);
    if (!paymentId) return { kind: "ignore" };
    return { kind: "expire", paymentId, checkoutId: text(data, "checkout_id") };
  }
  if (type === "refund.paid" || type === "dispute.lost") {
    const chargeId = text(data, "charge_id");
    if (!chargeId) return { kind: "ignore" };
    return { kind: "reverse", chargeId };
  }
  if (type === "dispute.updated" && (text(data, "status") ?? "").toLowerCase() === "lost") {
    const chargeId = text(data, "charge_id");
    if (!chargeId) return { kind: "ignore" };
    return { kind: "reverse", chargeId };
  }
  return { kind: "ignore" };
}

export function chargedAmountCoversPack(input: {
  status: string;
  currency: string | null;
  amount: string | null;
  expectedUsdMinor: number;
  expectedNgnMinor: number | null;
}): boolean {
  const status = input.status.toUpperCase();
  if (status !== "SUCCEEDED" && status !== "OVERPAID") return false;
  if (!input.amount || !input.currency) return false;
  const paid = decimalToMinor(input.amount);
  if (paid == null || paid <= 0) return false;
  const currency = input.currency.toUpperCase();
  if (currency === "USD") {
    return status === "OVERPAID" ? paid >= input.expectedUsdMinor : paid === input.expectedUsdMinor;
  }
  if (currency === "NGN" && input.expectedNgnMinor != null) {
    return status === "OVERPAID" ? paid >= input.expectedNgnMinor : paid === input.expectedNgnMinor;
  }
  return true;
}

function paymentIdFrom(data: EventData): string | null {
  const reference = text(data, "reference");
  if (reference && UUID.test(reference)) return reference;
  const metadata = data.metadata;
  if (metadata && typeof metadata === "object") {
    const id = text(metadata as EventData, "payment_id");
    if (id && UUID.test(id)) return id;
  }
  return null;
}

function text(data: EventData, key: string): string | null {
  const value = data[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export class BachsRequestError extends Error {
  status: number;
  code: string | null;
  constructor(status: number, code: string | null) {
    super(`Bachs request failed (${status}${code ? ` ${code}` : ""})`);
    this.status = status;
    this.code = code;
  }
}

export async function bachsRequest(path: string, init: { method: string; body?: unknown; idempotencyKey?: string }) {
  const key = process.env.BACHS_API_KEY?.trim();
  if (!key) throw new BachsRequestError(0, "missing_api_key");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  const res = await fetch(`${bachsApiBase(key)}${path}`, {
    method: init.method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await res.text();
  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
  }
  if (!res.ok) {
    const code =
      parsed && typeof parsed === "object" && typeof (parsed as { error_code?: unknown }).error_code === "string"
        ? (parsed as { error_code: string }).error_code
        : null;
    throw new BachsRequestError(res.status, code);
  }
  return parsed;
}

export function bachsProductId(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  for (const key of ["product_id", "id"]) {
    const value = record[key];
    if (typeof value === "string" && value.startsWith("prod_")) return value;
  }
  return null;
}

export function bachsCheckout(body: unknown): { checkoutId: string; checkoutUrl: string } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const checkoutId = record.checkout_id;
  const checkoutUrl = record.checkout_url;
  if (typeof checkoutId !== "string" || typeof checkoutUrl !== "string") return null;
  if (!checkoutId.startsWith("chk_") || !checkoutUrl.startsWith("https://")) return null;
  return { checkoutId, checkoutUrl };
}
