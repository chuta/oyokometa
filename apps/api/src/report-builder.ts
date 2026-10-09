import { createHash } from "node:crypto";
import {
  ACQUISITION_STATEMENT,
  LEGAL_DISCLAIMER,
  WHAT_THIS_DOES_NOT_ESTABLISH,
} from "@oyokometa/config";
import type { FindingsObject } from "@oyokometa/evidence";
import { buildBrandedPdf } from "./report-pdf.js";

export function reportPayload(findings: FindingsObject, reportId: string, includeGps: boolean) {
  return {
    report_id: reportId,
    evidence_id: findings.evidence_id,
    executive: findings.executive,
    per_category_confidence: {
      origin: findings.categories.origin.confidence,
      editing: findings.categories.editing.confidence,
      ai: findings.categories.ai.confidence,
      timestamps: findings.categories.timestamps.confidence,
      provenance: findings.categories.provenance.confidence,
    },
    findings: findings.categories,
    timeline: findings.timeline,
    provenance: findings.c2pa,
    ai_analysis: findings.categories.ai,
    identity: {
      ...findings.identity,
      file_name: includeGps ? findings.identity.file_name : null,
    },
    evidence: findings.evidence,
    gps: includeGps && findings.gps ? findings.gps : null,
    limitations: findings.limitations,
    what_this_does_not_establish: WHAT_THIS_DOES_NOT_ESTABLISH,
    acquisition_statement: ACQUISITION_STATEMENT,
    legal_disclaimer: LEGAL_DISCLAIMER,
    acquisition_time_utc: findings.acquisition_time_utc,
    analyzer_versions: findings.analyzer_versions,
    ruleset_version: findings.ruleset_version,
    trust_list_version: findings.trust_list_version,
  };
}

export function hashBuffer(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

export type ReportPayload = ReturnType<typeof reportPayload>;

export function jsonReportBytes(payload: ReportPayload) {
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}

/** Branded PDF with the same fields as the JSON report (RP-1). */
export async function pdfReportBytes(payload: ReportPayload) {
  return buildBrandedPdf(payload);
}
