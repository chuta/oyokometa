import { describe, expect, it } from "vitest";
import {
  detectorsForTier,
  mapScore,
  parseSightengineBody,
  shouldReleaseDeepHold,
  type DetectorRun,
} from "./detectors.js";

const ok = (paid: boolean): DetectorRun => ({
  result: {
    label: "unknown",
    raw_score: 0.1,
    model_id: "adapter-a",
    model_version: "1",
    face_manipulation_score: null,
  },
  error: null,
  releasesHoldOnFailure: paid,
});

describe("mapScore", () => {
  it("uses the configured bands", () => {
    expect(mapScore(0.59)).toBe("none");
    expect(mapScore(0.6)).toBe("weak");
    expect(mapScore(0.85)).toBe("strong");
  });
});

describe("parseSightengineBody", () => {
  it("reads the AI score and the face-manipulation score", () => {
    expect(
      parseSightengineBody({
        status: "success",
        request: { id: "req_1" },
        type: { ai_generated: 0.91, deepfake: 0.2, ai_generators: { flux: 0.5 } },
      }),
    ).toEqual({ ai: 0.91, face: 0.2, requestId: "req_1" });
  });

  it("rejects a failed request", () => {
    expect(() => parseSightengineBody({ status: "failure", type: { ai_generated: 0.9 } })).toThrow(/failed/);
  });
});

describe("detectorsForTier", () => {
  it("keeps the external detector off Quick Scan and off Deep Analysis without credentials", () => {
    const env = { DETECTOR_URL: "http://detector.internal:8080", NODE_ENV: "production" } as NodeJS.ProcessEnv;
    expect(detectorsForTier("quick", env)).toHaveLength(1);
    expect(detectorsForTier("quick", env)[0]?.releasesHoldOnFailure).toBe(false);
    expect(detectorsForTier("deep", env)).toHaveLength(1);
  });

  it("adds the external detector only for Deep Analysis", () => {
    const env = {
      DETECTOR_URL: "http://detector.internal:8080",
      SIGHTENGINE_API_USER: "user",
      SIGHTENGINE_API_SECRET: "secret",
      NODE_ENV: "production",
    } as NodeJS.ProcessEnv;
    const deep = detectorsForTier("deep", env);
    expect(deep).toHaveLength(2);
    expect(deep[1]?.releasesHoldOnFailure).toBe(true);
    expect(detectorsForTier("quick", env)).toHaveLength(1);
  });
});

describe("shouldReleaseDeepHold", () => {
  it("releases only when the paid external check did not return a score", () => {
    expect(shouldReleaseDeepHold("deep", [ok(false), { result: null, error: "timeout", releasesHoldOnFailure: true }])).toBe(true);
    expect(shouldReleaseDeepHold("deep", [ok(false), ok(true)])).toBe(false);
    expect(shouldReleaseDeepHold("quick", [{ result: null, error: "down", releasesHoldOnFailure: false }])).toBe(false);
  });
});
