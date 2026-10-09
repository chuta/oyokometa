import { createHash } from "node:crypto";
import {
  ACQUISITION_STATEMENT,
  LEGAL_DISCLAIMER,
  WHAT_THIS_DOES_NOT_ESTABLISH,
} from "@oyokometa/config";
import type { FindingsObject } from "@oyokometa/evidence";

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

export function jsonReportBytes(payload: ReturnType<typeof reportPayload>) {
  return Buffer.from(JSON.stringify(payload, null, 2), "utf8");
}

/** Minimal PDF with the same fields as the JSON report (RP-1). */
export function pdfReportBytes(payload: ReturnType<typeof reportPayload>) {
  const lines = [
    "Oyokometa report",
    `Report ID: ${payload.report_id}`,
    `Evidence ID: ${payload.evidence_id}`,
    `Executive: ${payload.executive.classification}`,
    `Confidence: ${payload.executive.confidence}`,
    payload.executive.summary,
    `Ruleset: ${payload.ruleset_version}`,
    `Acquisition (UTC): ${payload.acquisition_time_utc}`,
    payload.acquisition_statement,
    payload.limitations,
    payload.what_this_does_not_establish,
    payload.legal_disclaimer,
  ];
  for (const [k, v] of Object.entries(payload.per_category_confidence)) {
    lines.push(`${k}: ${v}`);
  }
  const text = lines.join("\n").replace(/[()\\]/g, "\\$&");
  const stream = `BT /F1 11 Tf 48 780 Td ${text
    .split("\n")
    .map((l, i) => (i === 0 ? `(${l.slice(0, 110)}) Tj` : `T* (${l.slice(0, 110)}) Tj`))
    .join(" ")} ET`;
  const streamBuf = Buffer.from(stream, "utf8");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${streamBuf.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(body.length);
    body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = body.length;
  let xrefTable = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xrefTable += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `${xrefTable}trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(body, "utf8");
}
