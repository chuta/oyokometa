const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/;

export type FeedbackMessage = {
  idempotencyKey: string;
  name: string;
  email: string;
  message: string;
};

export type FeedbackResult = { ok: true; value: FeedbackMessage } | { ok: false; message: string };

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

export function parseFeedback(body: unknown): FeedbackResult {
  if (!body || typeof body !== "object") return { ok: false, message: "Enter your message." };
  const raw = body as Record<string, unknown>;
  if (text(raw.website_confirm, 200)) return { ok: false, message: "The message could not be accepted." };

  const idempotencyKey = text(raw.idempotency_key, 80);
  if (!KEY_RE.test(idempotencyKey)) return { ok: false, message: "Refresh the page and send the message again." };

  const name = text(raw.name, 120);
  const email = text(raw.email, 200).toLowerCase();
  const message = text(raw.message, 2000);
  if (!name) return { ok: false, message: "Enter your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email address." };
  if (message.length < 10) return { ok: false, message: "Write a short message, at least a sentence." };

  return { ok: true, value: { idempotencyKey, name, email, message } };
}
