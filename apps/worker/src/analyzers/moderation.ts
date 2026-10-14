export const CONTENT_POLICY_PRODUCER = "content-policy@1.0.0";

const ENDPOINT = "https://api.thehive.ai/api/v3/hive/visual-moderation";
const TIMEOUT_MS = 20_000;

/** Sexual classes only. Suggestive clothing is not in this set. */
const REFUSE_AT = new Set(["general_nsfw", "yes_sexual_activity", "yes_realistic_nsfw"]);
export const ADULT_THRESHOLD = 0.9;

export type ClassScore = { className: string; score: number };

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export function collectClassScores(body: unknown): ClassScore[] {
  const found: ClassScore[] = [];
  walk(body, found);
  return found;
}

function walk(node: unknown, found: ClassScore[]) {
  if (Array.isArray(node)) {
    for (const item of node) walk(item, found);
    return;
  }
  if (!node || typeof node !== "object") return;
  const rec = node as Record<string, unknown>;
  if (typeof rec.class === "string" && typeof rec.score === "number" && Number.isFinite(rec.score)) {
    found.push({ className: rec.class, score: rec.score });
  }
  for (const value of Object.values(rec)) walk(value, found);
}

export function adultClassesPresent(scores: ClassScore[]) {
  const names = new Set(scores.map((score) => score.className));
  for (const name of REFUSE_AT) {
    if (!names.has(name)) return false;
  }
  return true;
}

export function refusesAdultContent(scores: ClassScore[]) {
  return scores.some((score) => REFUSE_AT.has(score.className) && score.score >= ADULT_THRESHOLD);
}

function refused() {
  return Object.assign(new Error("This file can't be accepted."), { code: "content_refused" });
}

function unavailable(detail: string) {
  return Object.assign(new Error("The service is temporarily unavailable."), {
    code: "service_unavailable",
    detail,
  });
}

export async function moderateAdultContent(
  jpeg: Buffer,
  env: NodeJS.ProcessEnv = process.env,
  fetchImpl: FetchLike = fetch,
): Promise<{ decision: "accepted" }> {
  const key = env.HIVE_API_KEY?.trim();
  if (!key) throw unavailable("content policy is not configured");

  const form = new FormData();
  const bytes = new Uint8Array(jpeg.byteLength);
  bytes.set(jpeg);
  form.append("media", new Blob([bytes], { type: "image/jpeg" }), "frame.jpg");

  let res: Response;
  try {
    res = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    throw unavailable(err instanceof Error ? err.name : "request_failed");
  }

  if (!res.ok) throw unavailable(`status_${res.status}`);

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw unavailable("invalid_json");
  }

  const scores = collectClassScores(body);
  if (!adultClassesPresent(scores)) throw unavailable("incomplete_classes");
  if (refusesAdultContent(scores)) throw refused();
  return { decision: "accepted" };
}
