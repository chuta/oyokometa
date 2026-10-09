import { RULESET_VERSION } from "@oyokometa/config";
import type { EvidenceItem, Finding, FindingsObject } from "./types.js";
import { RULE_TEMPLATES, LIMITATIONS, WHAT_NOT } from "./templates.js";

function has(items: EvidenceItem[], signal: string) {
  return items.some((i) => i.signal === signal && i.strength !== "none");
}

function strongCamera(items: EvidenceItem[]) {
  const keys = [
    "camera_make_model",
    "maker_notes",
    "quant_table_camera_match",
    "camera_lens",
    "camera_exposure",
  ];
  const hits = items.filter((i) => keys.includes(i.signal) && (i.strength === "strong" || i.strength === "very_strong"));
  return hits.length >= 1 && has(items, "camera_make_model");
}

function partialCamera(items: EvidenceItem[]) {
  return has(items, "camera_make_model") || has(items, "camera_exposure");
}

function unsignedAi(items: EvidenceItem[]) {
  return (
    has(items, "iptc_digital_source_type") ||
    has(items, "generator_string") ||
    has(items, "watermark_hit")
  );
}

function c2paTrusted(items: EvidenceItem[]) {
  return has(items, "c2pa_verified_trusted");
}

function c2paInvalid(items: EvidenceItem[]) {
  return has(items, "c2pa_invalid");
}

function aiActionOnCapture(items: EvidenceItem[]) {
  return items.some(
    (i) =>
      i.signal === "c2pa_verified_trusted" &&
      /ai.?action|composite|trainedAlgorithmic/i.test(i.value) &&
      /capture|camera/i.test(i.value),
  );
}

function generativeC2pa(items: EvidenceItem[]) {
  return items.some(
    (i) =>
      i.signal === "c2pa_verified_trusted" &&
      /trainedAlgorithmicMedia|generative|ai.generated/i.test(i.value),
  );
}

function detectorStrongCount(items: EvidenceItem[]) {
  return items.filter((i) => i.signal === "detector_strong").length;
}

function detectorWeak(items: EvidenceItem[]) {
  return has(items, "detector_weak");
}

function pick(
  ruleId: string,
  category: string,
  evidence: EvidenceItem[],
): Finding {
  const t = RULE_TEMPLATES[ruleId] ?? RULE_TEMPLATES.R11!;
  return {
    category,
    classification: t.classification,
    confidence: t.confidence as Finding["confidence"],
    rule_id: ruleId,
    evidence_ids: evidence.map((e) => e.id),
    summary: t.summary,
  };
}

/**
 * First match sets the executive finding. Later rows still contribute supporting evidence.
 * Models never write findings. Missing-data items (strength none) are ignored as support.
 */
export function evaluateRules(items: EvidenceItem[]): {
  executive: Finding;
  supporting: Finding[];
} {
  const usable = items.filter((i) => i.strength !== "none");
  const supporting: Finding[] = [];

  let executive: Finding;

  if (c2paTrusted(usable) && generativeC2pa(usable)) {
    executive = aiActionOnCapture(usable) ? pick("R1b", "origin", usable) : pick("R1", "origin", usable);
  } else if (c2paTrusted(usable) && !unsignedAi(usable) && !generativeC2pa(usable)) {
    executive = pick("R2", "origin", usable);
  } else if (c2paInvalid(usable)) {
    executive = pick("R3", "origin", usable);
    supporting.push(evaluateWithoutC2pa(usable));
  } else {
    executive = evaluateWithoutC2pa(usable);
  }

  if (has(items, "software_trace")) {
    supporting.push({
      category: "editing",
      classification: "Processed by software",
      confidence: "Medium",
      rule_id: "EDIT-1",
      evidence_ids: items.filter((i) => i.signal === "software_trace").map((i) => i.id),
      summary:
        "Software traces were detected. processed by named software; this does not establish what was changed. Editing history never changes the origin finding.",
    });
  } else {
    supporting.push({
      category: "editing",
      classification: "No editor traces detected",
      confidence: "Insufficient evidence",
      rule_id: "EDIT-0",
      evidence_ids: [],
      summary: "Absence of editor metadata is not evidence that the file is unedited.",
    });
  }

  return { executive, supporting };
}

function evaluateWithoutC2pa(usable: EvidenceItem[]): Finding {
  const cam = strongCamera(usable);
  const partial = partialCamera(usable);
  const aiMeta = unsignedAi(usable);
  const dStrong = detectorStrongCount(usable);
  const dWeak = detectorWeak(usable);

  if (aiMeta && !cam) return pick("R4", "origin", usable);
  if ((cam && dStrong >= 1) || (aiMeta && cam)) return pick("R5", "origin", usable);
  if (cam && dStrong === 0 && !aiMeta) return pick("R6", "origin", usable);
  if (partial && !cam && dStrong === 0 && !aiMeta) return pick("R7", "origin", usable);
  if (has(usable, "screenshot_indicator")) return pick("R8a", "origin", usable);
  if (has(usable, "scanner_indicator")) return pick("R8b", "origin", usable);
  if (!cam && !partial && dStrong >= 2) return pick("R9", "origin", usable);
  if (!cam && !partial && (dStrong === 1 || dWeak)) return pick("R10", "origin", usable);
  return pick("R11", "origin", usable);
}

export function buildFindingsObject(input: {
  evidence_id: string;
  items: EvidenceItem[];
  identity: FindingsObject["identity"];
  timeline: FindingsObject["timeline"];
  c2pa: FindingsObject["c2pa"];
  acquisition_time_utc: string;
  analyzer_versions: Record<string, string>;
  trust_list_version: string | null;
  tier_computed: "quick" | "deep";
  gps_present: boolean;
  ai_labels_enabled: boolean;
}): FindingsObject {
  const { executive, supporting } = evaluateRules(input.items);
  const editing =
    supporting.find((s) => s.category === "editing") ??
    pick("R11", "editing", []);
  const aiFinding: Finding = input.ai_labels_enabled
    ? supporting.find((s) => s.rule_id === "R9" || s.rule_id === "R10") ?? {
        category: "ai",
        classification:
          executive.rule_id === "R1" || executive.rule_id === "R4"
            ? executive.classification
            : "Inconclusive",
        confidence:
          executive.rule_id === "R9"
            ? "Medium"
            : executive.rule_id === "R10"
              ? "Low"
              : "Insufficient evidence",
        rule_id: "AI",
        evidence_ids: input.items.filter((i) => i.category === "model").map((i) => i.id),
        summary: executive.summary,
      }
    : {
        category: "ai",
        classification: "AI analysis not yet available",
        confidence: "Insufficient evidence",
        rule_id: "AI-OFF",
        evidence_ids: input.items
          .filter((i) =>
            ["iptc_digital_source_type", "generator_string", "c2pa_verified_trusted"].includes(
              i.signal,
            ),
          )
          .map((i) => i.id),
        summary:
          "Pixel-level AI labels are off until the benchmark gate is recorded as passed. Deterministic disclosures from metadata still show.",
      };

  const provenance: Finding = {
    category: "provenance",
    classification: input.c2pa.state.replaceAll("_", " "),
    confidence:
      input.c2pa.state === "verified_and_trusted" ? "Verified" : "Insufficient evidence",
    rule_id: "C2PA",
    evidence_ids: input.items.filter((i) => i.category === "provenance").map((i) => i.id),
    summary:
      input.c2pa.state === "not_detected"
        ? "Most images have no Content Credentials. This says nothing about whether the image is genuine."
        : `Content Credentials state: ${input.c2pa.state}`,
  };

  const timestamps: Finding = {
    category: "timestamps",
    classification: "Timeline of recorded timestamps",
    confidence: "n/a",
    rule_id: "TS",
    evidence_ids: input.items.filter((i) => i.signal.startsWith("timestamp")).map((i) => i.id),
    summary: "No single original date is shown. Each timestamp is labelled with its field and tier.",
  };

  return {
    evidence_id: input.evidence_id,
    ruleset_version: RULESET_VERSION,
    analyzer_versions: input.analyzer_versions,
    trust_list_version: input.trust_list_version,
    acquisition_time_utc: input.acquisition_time_utc,
    tier_computed: input.tier_computed,
    executive,
    supporting,
    categories: {
      origin: executive,
      editing,
      ai: aiFinding,
      timestamps,
      provenance,
    },
    timeline: input.timeline,
    identity: input.identity,
    c2pa: input.c2pa,
    evidence: input.items,
    gps_present: input.gps_present,
    gps_revealed: false,
    gps: null,
    ai_labels_enabled: input.ai_labels_enabled,
    limitations: LIMITATIONS,
    what_this_does_not_establish: WHAT_NOT,
  };
}

export { RULESET_VERSION };
