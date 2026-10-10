import { describe, expect, it } from "vitest";
import { evaluateRules, buildFindingsObject } from "./rules.js";
import type { EvidenceItem, FindingsObject } from "./types.js";

function item(partial: Partial<EvidenceItem> & Pick<EvidenceItem, "signal" | "strength">): EvidenceItem {
  return {
    id: partial.id ?? `ev_${partial.signal}`,
    category: partial.category ?? "metadata",
    signal: partial.signal,
    value: partial.value ?? "x",
    source: partial.source ?? "test",
    tier: partial.tier ?? "detected",
    strength: partial.strength,
    producer: partial.producer ?? "test@1.0.0",
    raw_ref: partial.raw_ref ?? "raw",
  };
}

const identity: FindingsObject["identity"] = {
  file_name: "a.jpg",
  detected_type: "image/jpeg",
  byte_size: 10,
  width: 10,
  height: 10,
  aspect_ratio: "1:1",
  colour_space: "sRGB",
  bit_depth: 8,
  icc_profile: null,
  orientation: "1",
  sha256: "aa".repeat(32),
  phash: "0".repeat(16),
  multi_frame_note: null,
};

const c2paEmpty: FindingsObject["c2pa"] = {
  state: "not_detected",
  signer: null,
  claim_generator: null,
  signed_at: null,
  actions: [],
  ingredients: [],
  ai_assertion: null,
  failure_reason: null,
  trust_list_version: "tl-1",
};

describe("rules engine", () => {
  it("does not treat missing EXIF/C2PA as AI support", () => {
    const items = [
      item({ signal: "missing_exif", strength: "none", category: "metadata" }),
      item({ signal: "missing_c2pa", strength: "none", category: "provenance" }),
    ];
    const { executive } = evaluateRules(items);
    expect(executive.rule_id).toBe("R11");
    expect(executive.classification).toBe("Inconclusive");
  });

  it("matches R6 likely camera-originated", () => {
    const { executive } = evaluateRules([
      item({
        signal: "camera_make_model",
        strength: "strong",
        value: "Canon EOS",
        category: "metadata",
      }),
      item({ signal: "maker_notes", strength: "strong", category: "metadata" }),
    ]);
    expect(executive.rule_id).toBe("R6");
  });

  it("matches R5 conflicting evidence", () => {
    const { executive } = evaluateRules([
      item({ signal: "camera_make_model", strength: "strong", category: "metadata" }),
      item({ signal: "detector_strong", strength: "strong", category: "model" }),
    ]);
    expect(executive.rule_id).toBe("R5");
    expect(executive.classification).toBe("Conflicting evidence");
  });

  it("matches R2 when C2PA trusted capture", () => {
    const { executive } = evaluateRules([
      item({
        signal: "c2pa_verified_trusted",
        strength: "very_strong",
        value: "capture camera",
        category: "provenance",
        tier: "verified",
      }),
    ]);
    expect(executive.rule_id).toBe("R2");
    expect(executive.confidence).toBe("Verified");
  });

  it("is reproducible (EV-10)", () => {
    const items = [
      item({ signal: "camera_make_model", strength: "strong" }),
      item({ signal: "software_trace", strength: "moderate", value: "Lightroom" }),
    ];
    const a = buildFindingsObject({
      evidence_id: "h",
      items,
      identity,
      timeline: [],
      c2pa: c2paEmpty,
      acquisition_time_utc: "2026-01-01T00:00:00Z",
      analyzer_versions: { metadata: "1.0.0" },
      trust_list_version: "tl-1",
      tier_computed: "quick",
      gps_present: false,
      ai_labels_enabled: false,
    });
    const b = buildFindingsObject({
      evidence_id: "h",
      items,
      identity,
      timeline: [],
      c2pa: c2paEmpty,
      acquisition_time_utc: "2026-01-01T00:00:00Z",
      analyzer_versions: { metadata: "1.0.0" },
      trust_list_version: "tl-1",
      tier_computed: "quick",
      gps_present: false,
      ai_labels_enabled: false,
    });
    expect(JSON.stringify(a.executive)).toBe(JSON.stringify(b.executive));
    expect(a.ruleset_version).toBe(b.ruleset_version);
  });

  it("keeps AI labels off in findings when gate is false", () => {
    const obj = buildFindingsObject({
      evidence_id: "h",
      items: [item({ signal: "detector_strong", strength: "strong", category: "model" })],
      identity,
      timeline: [],
      c2pa: c2paEmpty,
      acquisition_time_utc: "2026-01-01T00:00:00Z",
      analyzer_versions: {},
      trust_list_version: null,
      tier_computed: "deep",
      gps_present: false,
      ai_labels_enabled: false,
    });
    expect(obj.categories.ai.classification).toBe("AI analysis not yet available");
  });

  it("says the AI check is unavailable when a detector did not finish", () => {
    const obj = buildFindingsObject({
      evidence_id: "h",
      items: [],
      identity,
      timeline: [],
      c2pa: c2paEmpty,
      acquisition_time_utc: "2026-01-01T00:00:00Z",
      analyzer_versions: {},
      trust_list_version: null,
      tier_computed: "deep",
      gps_present: false,
      ai_labels_enabled: true,
      ai_unavailable: true,
    });
    expect(obj.categories.ai.classification).toBe("AI analysis unavailable");
  });
});
