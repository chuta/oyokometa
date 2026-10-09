export type TruthTier = "verified" | "detected" | "inferred" | "declared";
export type Strength =
  | "very_strong"
  | "strong"
  | "moderate"
  | "weak"
  | "none";
export type EvidenceCategory =
  | "metadata"
  | "provenance"
  | "structure"
  | "pixel"
  | "model"
  | "declaration";
export type Confidence = "High" | "Medium" | "Low" | "Insufficient evidence" | "Verified";

export type EvidenceItem = {
  id: string;
  category: EvidenceCategory;
  signal: string;
  value: string;
  source: string;
  tier: TruthTier;
  strength: Strength;
  producer: string;
  raw_ref: string;
};

export type Finding = {
  category: string;
  classification: string;
  confidence: Confidence | "n/a";
  rule_id: string;
  evidence_ids: string[];
  summary: string;
};

export type TimelineEvent = {
  field: string;
  value: string;
  zone: "utc" | "offset" | "local_unrecorded" | "unknown";
  tier: TruthTier | "unknown";
  anomaly?: string;
};

export type C2paState =
  | "verified_and_trusted"
  | "valid_signer_not_recognised"
  | "invalid"
  | "not_detected"
  | "unable_to_verify";

export type FindingsObject = {
  evidence_id: string;
  ruleset_version: string;
  analyzer_versions: Record<string, string>;
  trust_list_version: string | null;
  acquisition_time_utc: string;
  tier_computed: "quick" | "deep";
  executive: Finding;
  supporting: Finding[];
  categories: {
    origin: Finding;
    editing: Finding;
    ai: Finding;
    timestamps: Finding;
    provenance: Finding;
  };
  timeline: TimelineEvent[];
  identity: {
    file_name: string | null;
    detected_type: string;
    byte_size: number;
    width: number | null;
    height: number | null;
    aspect_ratio: string | null;
    colour_space: string | null;
    bit_depth: number | null;
    icc_profile: string | null;
    orientation: string | null;
    sha256: string;
    phash: string | null;
    multi_frame_note: string | null;
  };
  c2pa: {
    state: C2paState;
    signer: string | null;
    claim_generator: string | null;
    signed_at: string | null;
    actions: unknown;
    ingredients: unknown;
    ai_assertion: string | null;
    failure_reason: string | null;
    trust_list_version: string | null;
  };
  evidence: EvidenceItem[];
  gps_present: boolean;
  gps_revealed: boolean;
  gps: { lat: number; lng: number } | null;
  ai_labels_enabled: boolean;
  limitations: string;
  what_this_does_not_establish: string;
};
