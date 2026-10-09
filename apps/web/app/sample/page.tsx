import { FindingsDashboard } from "@oyokometa/findings-ui";
import { buildFindingsObject } from "@oyokometa/evidence";
import type { EvidenceItem } from "@oyokometa/evidence";

const items: EvidenceItem[] = [
  {
    id: "ev_sample_cam",
    category: "metadata",
    signal: "camera_make_model",
    value: "Sample Camera Co. Demo",
    source: "EXIF:Make, EXIF:Model",
    tier: "detected",
    strength: "strong",
    producer: "metadata-worker@1.0.0",
    raw_ref: "sample",
  },
];

const findings = buildFindingsObject({
  evidence_id: "0".repeat(64),
  items,
  identity: {
    file_name: "sample.jpg",
    detected_type: "image/jpeg",
    byte_size: 12000,
    width: 800,
    height: 600,
    aspect_ratio: "4:3",
    colour_space: "sRGB",
    bit_depth: 8,
    icc_profile: null,
    orientation: "1",
    sha256: "0".repeat(64),
    phash: "00".repeat(8),
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
    trust_list_version: "sample",
  },
  acquisition_time_utc: "2026-01-01T00:00:00.000Z",
  analyzer_versions: { sample: "1.0.0" },
  trust_list_version: "sample",
  tier_computed: "quick",
  gps_present: false,
  ai_labels_enabled: false,
});

export default function SamplePage() {
  return (
    <div>
      <p className="kicker">Non-personal sample</p>
      <FindingsDashboard findings={findings} />
    </div>
  );
}
