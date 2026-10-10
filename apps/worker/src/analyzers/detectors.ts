import { DETECTOR_THRESHOLDS, DETECTOR_TIMEOUT_MS } from "@oyokometa/config";

export const DETECTOR_PRODUCER = "detector-adapter@1.0.0";

const LOCAL_MODEL_ID = "adapter-a";
const LOCAL_MODEL_VERSION = "cf-vit-s-384-onnx-v1.1";
const VENDOR_MODEL_ID = "adapter-b";
const VENDOR_MODEL_VERSION = "genai-deepfake";

export type DetectorResult = {
  label: "synthetic" | "camera" | "unknown";
  raw_score: number;
  model_id: string;
  model_version: string;
  /** Face-swap score from the same vendor call. Not a second independent detector. */
  face_manipulation_score: number | null;
};

export interface Detector {
  /** When this call fails on Deep Analysis, the credit hold is released. */
  releasesHoldOnFailure: boolean;
  analyze(image: Buffer): Promise<DetectorResult>;
}

export type DetectorRun = {
  result: DetectorResult | null;
  error: string | null;
  releasesHoldOnFailure: boolean;
};

/** Scores stored, never shown. Thresholds live in config. Names stay inside adapters (AN-29). */
export function mapScore(
  score: number,
  weak = DETECTOR_THRESHOLDS.weak,
  strong = DETECTOR_THRESHOLDS.strong,
): "none" | "weak" | "strong" {
  if (score >= strong) return "strong";
  if (score >= weak) return "weak";
  return "none";
}

function labelFor(score: number): DetectorResult["label"] {
  return mapScore(score) === "strong" ? "synthetic" : "unknown";
}

export class NullDetector implements Detector {
  releasesHoldOnFailure = false;
  constructor(
    private model_id: string,
    private model_version: string,
  ) {}
  async analyze(_image: Buffer): Promise<DetectorResult> {
    return {
      label: "unknown",
      raw_score: 0,
      model_id: this.model_id,
      model_version: this.model_version,
      face_manipulation_score: null,
    };
  }
}

export function parseSightengineBody(body: unknown): { ai: number; face: number | null; requestId: string } {
  if (!body || typeof body !== "object") throw new Error("detector response was not JSON");
  const row = body as { status?: unknown; type?: { ai_generated?: unknown; deepfake?: unknown }; request?: { id?: unknown } };
  if (row.status !== "success") throw new Error("detector request failed");
  const ai = row.type?.ai_generated;
  if (typeof ai !== "number" || !Number.isFinite(ai)) throw new Error("detector response had no score");
  const face = row.type?.deepfake;
  return {
    ai,
    face: typeof face === "number" && Number.isFinite(face) ? face : null,
    requestId: typeof row.request?.id === "string" ? row.request.id : "",
  };
}

export class LocalDetector implements Detector {
  releasesHoldOnFailure = false;
  constructor(
    private url: string,
    private token = "",
    private timeoutMs = DETECTOR_TIMEOUT_MS,
  ) {}

  async analyze(image: Buffer): Promise<DetectorResult> {
    const res = await fetch(new URL("/analyze", this.url), {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
      },
      body: new Uint8Array(image),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`local detector returned ${res.status}`);
    const json = (await res.json()) as { raw_score?: unknown };
    if (typeof json.raw_score !== "number" || !Number.isFinite(json.raw_score)) {
      throw new Error("local detector response had no score");
    }
    return {
      label: labelFor(json.raw_score),
      raw_score: json.raw_score,
      model_id: LOCAL_MODEL_ID,
      model_version: LOCAL_MODEL_VERSION,
      face_manipulation_score: null,
    };
  }
}

export class SightengineDetector implements Detector {
  releasesHoldOnFailure = true;
  constructor(
    private user: string,
    private secret: string,
    private timeoutMs = DETECTOR_TIMEOUT_MS,
    private endpoint = "https://api.sightengine.com/1.0/check.json",
  ) {}

  async analyze(image: Buffer): Promise<DetectorResult> {
    const form = new FormData();
    form.append("media", new Blob([new Uint8Array(image)]), "upload.jpg");
    form.append("models", "genai,deepfake");
    form.append("api_user", this.user);
    form.append("api_secret", this.secret);
    const res = await fetch(this.endpoint, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(`vendor detector returned ${res.status}`);
    const parsed = parseSightengineBody(json);
    return {
      label: labelFor(parsed.ai),
      raw_score: parsed.ai,
      model_id: VENDOR_MODEL_ID,
      model_version: VENDOR_MODEL_VERSION,
      face_manipulation_score: parsed.face,
    };
  }
}

/** Quick Scan uses the local model. Deep Analysis adds the external model when credentials exist. */
export function detectorsForTier(tier: "quick" | "deep", env: NodeJS.ProcessEnv = process.env): Detector[] {
  const list: Detector[] = [];
  if (env.DETECTOR_URL) {
    list.push(new LocalDetector(env.DETECTOR_URL, env.DETECTOR_AUTH_TOKEN ?? ""));
  } else if (env.NODE_ENV !== "production") {
    list.push(new NullDetector(LOCAL_MODEL_ID, "0.0.0"));
  }
  if (tier === "deep" && env.SIGHTENGINE_API_USER && env.SIGHTENGINE_API_SECRET) {
    list.push(new SightengineDetector(env.SIGHTENGINE_API_USER, env.SIGHTENGINE_API_SECRET));
  }
  return list;
}

export async function runDetectors(image: Buffer, tier: "quick" | "deep", env: NodeJS.ProcessEnv = process.env): Promise<DetectorRun[]> {
  const runs: DetectorRun[] = [];
  for (const detector of detectorsForTier(tier, env)) {
    try {
      runs.push({ result: await detector.analyze(image), error: null, releasesHoldOnFailure: detector.releasesHoldOnFailure });
    } catch (err) {
      const message = err instanceof Error ? err.message : "detector failed";
      runs.push({ result: null, error: message.slice(0, 200), releasesHoldOnFailure: detector.releasesHoldOnFailure });
    }
  }
  return runs;
}

/** Deep Analysis is released when the external detector was configured and did not return a score. */
export function shouldReleaseDeepHold(tier: "quick" | "deep", runs: DetectorRun[]): boolean {
  return tier === "deep" && runs.some((run) => run.releasesHoldOnFailure && run.result === null);
}
