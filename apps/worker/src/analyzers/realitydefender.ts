import sharp from "sharp";
import type { Detector, DetectorResult } from "./detectors.js";

const API_BASE = "https://api.prd.realitydefender.xyz";
const MODEL_ID = "adapter-c";
const POLL_INTERVAL_MS = 3_000;
const POLL_BUDGET_MS = 90_000;

type FetchLike = typeof fetch;

export type RealityDefenderBand = "none" | "weak" | "strong";

export type ParsedRealityDefender = {
  requestId: string;
  status: string;
  rawScore: number;
  band: RealityDefenderBand;
  releaseVersion: string;
  notApplicableReason: string | null;
  modelsDisagree: boolean;
  inProgress: boolean;
};

/** Ensemble only. A low score is not evidence of a camera original. */
export function bandForEnsemble(status: string, finalScore: number | null): RealityDefenderBand {
  if (status === "FAKE" || status === "MANIPULATED") return "strong";
  if (status === "SUSPICIOUS") return "weak";
  if (finalScore !== null && finalScore >= 56) return "strong";
  if (finalScore !== null && finalScore >= 45) return "weak";
  return "none";
}

export function parseRealityDefenderMedia(body: unknown): ParsedRealityDefender {
  if (!body || typeof body !== "object") throw new Error("reality defender response was not JSON");
  const row = body as {
    requestId?: unknown;
    releaseVersion?: unknown;
    overallStatus?: unknown;
    resultsSummary?: { status?: unknown; metadata?: { finalScore?: unknown; reasons?: unknown } };
    models?: unknown;
  };
  const summaryStatus = typeof row.resultsSummary?.status === "string" ? row.resultsSummary.status : "";
  const overall = typeof row.overallStatus === "string" ? row.overallStatus : "";
  const status = summaryStatus || overall;
  const finalScore = row.resultsSummary?.metadata?.finalScore;
  const score = typeof finalScore === "number" && Number.isFinite(finalScore) ? finalScore : null;
  const inProgress = status === "ANALYZING" || status === "DOWNLOADING" || status === "";
  if (status === "UNABLE_TO_EVALUATE") throw new Error("reality defender could not evaluate the image");
  const models = Array.isArray(row.models) ? row.models : [];
  const decisions = models
    .map((model) => {
      if (!model || typeof model !== "object") return null;
      const item = model as { name?: unknown; status?: unknown };
      const name = typeof item.name === "string" ? item.name : "";
      const modelStatus = typeof item.status === "string" ? item.status : "";
      if (!name || modelStatus === "NOT_APPLICABLE" || modelStatus === "ANALYZING") return null;
      if (name.toLowerCase().includes("ensemble")) return null;
      return modelStatus;
    })
    .filter((item): item is string => Boolean(item));
  const ensemble = status === "FAKE" || status === "MANIPULATED" ? "FAKE" : status;
  const modelsDisagree =
    decisions.length > 0 && decisions.some((item) => (item === "FAKE" || item === "MANIPULATED") !== (ensemble === "FAKE"));
  return {
    requestId: typeof row.requestId === "string" ? row.requestId : "",
    status,
    rawScore: score === null ? 0 : score / 100,
    band: status === "NOT_APPLICABLE" ? "none" : bandForEnsemble(status, score),
    releaseVersion: typeof row.releaseVersion === "string" && row.releaseVersion ? row.releaseVersion : "ensemble",
    notApplicableReason: status === "NOT_APPLICABLE" ? reasonText(row.resultsSummary?.metadata?.reasons) : null,
    modelsDisagree,
    inProgress,
  };
}

function reasonText(reasons: unknown): string | null {
  if (!Array.isArray(reasons) || !reasons[0] || typeof reasons[0] !== "object") return null;
  const reason = reasons[0] as { message?: unknown; code?: unknown };
  if (typeof reason.message === "string" && reason.message) return reason.message.slice(0, 200);
  if (typeof reason.code === "string" && reason.code) return reason.code.slice(0, 200);
  return null;
}

export function uploadNameFor(buf: Buffer): { fileName: string; passthrough: boolean } {
  if (buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8) return { fileName: "image.jpg", passthrough: true };
  if (buf.length > 8 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") return { fileName: "image.png", passthrough: true };
  if (buf.length > 6 && buf.toString("ascii", 0, 4) === "GIF8") return { fileName: "image.gif", passthrough: true };
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    return { fileName: "image.webp", passthrough: true };
  }
  return { fileName: "image.jpg", passthrough: false };
}

export async function imageForUpload(buf: Buffer): Promise<{ bytes: Buffer; fileName: string; rendition: boolean }> {
  const named = uploadNameFor(buf);
  if (named.passthrough) return { bytes: buf, fileName: named.fileName, rendition: false };
  const bytes = await sharp(buf, { failOn: "none", pages: 1 }).rotate().jpeg({ quality: 90 }).toBuffer();
  if (bytes.length > 50 * 1024 * 1024) throw new Error("reality defender image is too large");
  return { bytes, fileName: named.fileName, rendition: true };
}

function signedUpload(body: unknown): { signedUrl: string; requestId: string } {
  if (!body || typeof body !== "object") throw new Error("reality defender upload failed");
  const row = body as { requestId?: unknown; response?: { signedUrl?: unknown } };
  const signedUrl = row.response?.signedUrl;
  const requestId = row.requestId;
  if (typeof signedUrl !== "string" || !signedUrl.startsWith("https://") || typeof requestId !== "string" || !requestId) {
    throw new Error("reality defender upload failed");
  }
  return { signedUrl, requestId };
}

export class RealityDefenderDetector implements Detector {
  /** Sightengine remains the check that releases a Deep Analysis hold. */
  releasesHoldOnFailure = false;

  constructor(
    private apiKey: string,
    private deps: {
      fetch?: FetchLike;
      sleep?: (ms: number) => Promise<void>;
      now?: () => number;
      timeoutMs?: number;
      intervalMs?: number;
    } = {},
  ) {}

  async analyze(image: Buffer): Promise<DetectorResult> {
    const prepared = await imageForUpload(image);
    const upload = await this.requestUpload(prepared.fileName);
    await this.putImage(upload.signedUrl, prepared.bytes);
    const parsed = await this.poll(upload.requestId);
    return {
      label: parsed.band === "strong" ? "synthetic" : "unknown",
      raw_score: parsed.rawScore,
      band: parsed.band,
      model_id: MODEL_ID,
      model_version: parsed.releaseVersion,
      face_manipulation_score: null,
      request_id: parsed.requestId || upload.requestId,
      status: parsed.status,
      not_applicable_reason: parsed.notApplicableReason,
      models_disagree: parsed.modelsDisagree,
      rendition: prepared.rendition,
    };
  }

  private async requestUpload(fileName: string) {
    const res = await this.fetchImpl()(`${API_BASE}/api/files/aws-presigned`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.apiKey },
      body: JSON.stringify({ fileName }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error("reality defender upload failed");
    return signedUpload(await res.json().catch(() => null));
  }

  private async putImage(signedUrl: string, bytes: Buffer) {
    const res = await this.fetchImpl()(signedUrl, {
      method: "PUT",
      headers: { "content-type": "application/octet-stream" },
      body: new Uint8Array(bytes),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error("reality defender upload failed");
  }

  private async poll(requestId: string): Promise<ParsedRealityDefender> {
    const timeoutMs = this.deps.timeoutMs ?? POLL_BUDGET_MS;
    const intervalMs = this.deps.intervalMs ?? POLL_INTERVAL_MS;
    const deadline = this.now() + timeoutMs;
    while (this.now() < deadline) {
      const res = await this.fetchImpl()(`${API_BASE}/api/media/users/${encodeURIComponent(requestId)}`, {
        headers: { "x-api-key": this.apiKey },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 404) {
        await this.sleep(intervalMs);
        continue;
      }
      if (!res.ok) throw new Error("reality defender result failed");
      const parsed = parseRealityDefenderMedia(await res.json().catch(() => null));
      if (!parsed.inProgress) return parsed;
      await this.sleep(intervalMs);
    }
    throw new Error("reality defender timed out");
  }

  private fetchImpl() {
    return this.deps.fetch ?? fetch;
  }

  private now() {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  private sleep(ms: number) {
    return this.deps.sleep ? this.deps.sleep(ms) : new Promise((resolve) => setTimeout(resolve, ms));
  }
}
