import { describe, expect, it } from "vitest";
import { buildFindingsObject } from "@oyokometa/evidence";
import type { EvidenceItem } from "@oyokometa/evidence";
import { hashBuffer, jsonReportBytes, pdfReportBytes, reportPayload } from "./report-builder.js";

const items: EvidenceItem[] = [
  {
    id: "ev1",
    category: "metadata",
    signal: "camera_make_model",
    value: "Demo",
    source: "EXIF",
    tier: "detected",
    strength: "strong",
    producer: "t@1",
    raw_ref: "raw",
  },
];

describe("report parity", () => {
  it("JSON and PDF are built from the same findings object", () => {
    const findings = buildFindingsObject({
      evidence_id: "ab".repeat(32),
      items,
      identity: {
        file_name: "x.jpg",
        detected_type: "image/jpeg",
        byte_size: 1,
        width: 1,
        height: 1,
        aspect_ratio: "1:1",
        colour_space: null,
        bit_depth: null,
        icc_profile: null,
        orientation: null,
        sha256: "ab".repeat(32),
        phash: null,
        multi_frame_note: null,
      },
      timeline: [],
      c2pa: {
        state: "not_detected",
        signer: null,
        claim_generator: null,
        signed_at: null,
        actions: [],
        ingredients: [],
        ai_assertion: null,
        failure_reason: null,
        trust_list_version: null,
      },
      acquisition_time_utc: "2026-01-01T00:00:00.000Z",
      analyzer_versions: {},
      trust_list_version: null,
      tier_computed: "deep",
      gps_present: false,
      ai_labels_enabled: false,
    });
    const payload = reportPayload(findings, "rep1", false);
    const json = jsonReportBytes(payload);
    const pdf = pdfReportBytes(payload);
    expect(json.toString()).toContain(payload.executive.classification);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(hashBuffer(json)).toHaveLength(64);
    expect(payload.identity.file_name).toBeNull();
  });
});
