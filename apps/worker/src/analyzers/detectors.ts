export const DETECTOR_PRODUCER = "detector-adapter@1.0.0";

export type DetectorResult = {
  label: "synthetic" | "camera" | "unknown";
  raw_score: number;
  model_id: string;
  model_version: string;
};

export interface Detector {
  analyze(image: Buffer): Promise<DetectorResult>;
}

/** Scores stored, never shown. Thresholds live in config. Names stay inside adapters (AN-29). */
export class NullDetector implements Detector {
  constructor(
    private model_id: string,
    private model_version: string,
  ) {}
  async analyze(_image: Buffer): Promise<DetectorResult> {
    return { label: "unknown", raw_score: 0, model_id: this.model_id, model_version: this.model_version };
  }
}

export function mapScore(score: number, weak = 0.6, strong = 0.85): "none" | "weak" | "strong" {
  if (score >= strong) return "strong";
  if (score >= weak) return "weak";
  return "none";
}

export function detectorsForTier(tier: "quick" | "deep"): Detector[] {
  if (tier === "deep") return [new NullDetector("adapter-a", "0.0.0"), new NullDetector("adapter-b", "0.0.0")];
  return [new NullDetector("adapter-a", "0.0.0")];
}
