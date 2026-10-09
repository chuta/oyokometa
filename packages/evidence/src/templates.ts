import {
  C2PA_NOT_DETECTED_LINE,
  LIMITATIONS_BLOCK,
  WHAT_THIS_DOES_NOT_ESTABLISH,
} from "@oyokometa/config";

export const LIMITATIONS = LIMITATIONS_BLOCK;
export const WHAT_NOT = WHAT_THIS_DOES_NOT_ESTABLISH;

export const RULE_TEMPLATES: Record<
  string,
  { classification: string; summary: string; confidence: string }
> = {
  R1: {
    classification: "AI generation indicated",
    summary:
      "Content Credentials verified and trusted record a generative-AI source type or action.",
    confidence: "Verified",
  },
  R1b: {
    classification: "AI assistance indicated",
    summary:
      "Content Credentials verified and trusted record an AI action on a captured base.",
    confidence: "Verified",
  },
  R2: {
    classification: "Camera-originated, Content Credentials verified",
    summary:
      "Content Credentials verified and trusted describe a capture source with no AI action.",
    confidence: "Verified",
  },
  R3: {
    classification: "Content Credentials present but failed verification",
    summary:
      "A Content Credentials manifest is present but signature or content binding failed. Origin is assessed from other evidence.",
    confidence: "n/a",
  },
  R4: {
    classification: "AI generation indicated by file metadata",
    summary:
      "The file contains an unsigned AI disclosure (source type, generator string, or watermark). This is detected, alterable evidence.",
    confidence: "Medium",
  },
  R5: {
    classification: "Conflicting evidence",
    summary:
      "Strong camera evidence and strong synthetic-image signals disagree. Both sets are listed. This is not resolved automatically.",
    confidence: "n/a",
  },
  R6: {
    classification: "Likely camera-originated",
    summary:
      "Strong camera evidence (make, model, and related capture fields) is present and no AI signal was found.",
    confidence: "High",
  },
  R7: {
    classification: "Likely camera-originated",
    summary: "Partial camera metadata is present and no AI signal was found.",
    confidence: "Medium",
  },
  R8a: {
    classification: "Likely screenshot",
    summary: "Screenshot indicators are present (metadata or typical device-resolution capture).",
    confidence: "Medium",
  },
  R8b: {
    classification: "Likely scanned",
    summary: "Scanner indicators are present in the file metadata.",
    confidence: "Medium",
  },
  R9: {
    classification: "AI signals detected",
    summary:
      "No camera evidence; two detectors agree at strong. No provenance or metadata evidence supports or contradicts this.",
    confidence: "Medium",
  },
  R10: {
    classification: "Possible AI signals",
    summary:
      "No camera evidence; a single detector signal is present. No provenance or metadata evidence supports or contradicts this.",
    confidence: "Low",
  },
  R11: {
    classification: "Inconclusive",
    summary: "Not enough evidence to classify origin.",
    confidence: "Insufficient evidence",
  },
};

export { C2PA_NOT_DETECTED_LINE };
