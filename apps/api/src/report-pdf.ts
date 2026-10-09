import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFFont, PDFImage, PDFPage, rgb, StandardFonts } from "pdf-lib";
import type { ReportPayload } from "./report-builder.js";
import { BRAND } from "./brand.js";

const PAGE = { w: 612, h: 792 };
const M = { l: 48, r: 48, t: 56, b: 52 };
const WIDTH = PAGE.w - M.l - M.r;

const C = {
  bg: rgb(0, 0, 0),
  surface: rgb(18 / 255, 18 / 255, 18 / 255),
  ink: rgb(245 / 255, 245 / 255, 244 / 255),
  muted: rgb(168 / 255, 162 / 255, 158 / 255),
  line: rgb(42 / 255, 42 / 255, 42 / 255),
  brand: rgb(245 / 255, 165 / 255, 36 / 255),
  onBrand: rgb(17 / 255, 17 / 255, 17 / 255),
};

function logoFile() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "../../../apps/web/public/oyokometa_logo.png");
}

function winAnsi(text: string) {
  return String(text ?? "")
    .replaceAll("\u2014", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2018", "'")
    .replaceAll("\u2019", "'")
    .replaceAll("\u201c", '"')
    .replaceAll("\u201d", '"')
    .replaceAll("\u00d7", "x")
    .replaceAll("\u2022", "-")
    .replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");
}

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const paragraph of winAnsi(text).split(/\n+/)) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = "";
    const pushLong = (token: string) => {
      let chunk = "";
      for (const ch of token) {
        const next = chunk + ch;
        if (font.widthOfTextAtSize(next, size) <= width) chunk = next;
        else {
          if (chunk) out.push(chunk);
          chunk = ch;
        }
      }
      return chunk;
    };
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width) {
        line = next;
      } else {
        if (line) out.push(line);
        line = font.widthOfTextAtSize(word, size) <= width ? word : pushLong(word);
      }
    }
    if (line) out.push(line);
  }
  return out.length ? out : [""];
}

class DarkReport {
  constructor(
    private doc: PDFDocument,
    private regular: PDFFont,
    private bold: PDFFont,
    private logo: PDFImage | null,
  ) {}

  page!: PDFPage;
  y = 0;
  pageNo = 0;

  start() {
    this.addPage();
  }

  private addPage() {
    this.page = this.doc.addPage([PAGE.w, PAGE.h]);
    this.pageNo += 1;
    this.page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: C.bg });
    this.page.drawRectangle({ x: 0, y: PAGE.h - 3, width: PAGE.w, height: 3, color: C.brand });
    this.y = PAGE.h - M.t;
    if (this.logo && this.pageNo > 1) {
      const h = 16;
      const w = (this.logo.width / this.logo.height) * h;
      this.page.drawImage(this.logo, { x: M.l, y: PAGE.h - 28, width: w, height: h });
    }
    this.page.drawText(BRAND.name, {
      x: PAGE.w - M.r - this.bold.widthOfTextAtSize(BRAND.name, 9),
      y: PAGE.h - 26,
      size: 9,
      font: this.bold,
      color: C.brand,
    });
    this.page.drawLine({
      start: { x: M.l, y: M.b - 10 },
      end: { x: PAGE.w - M.r, y: M.b - 10 },
      thickness: 0.5,
      color: C.line,
    });
    const foot = `${BRAND.tagline}  /  ${this.pageNo}`;
    this.page.drawText(foot, {
      x: M.l,
      y: 22,
      size: 8,
      font: this.regular,
      color: C.muted,
    });
  }

  ensure(h: number) {
    if (this.y - h < M.b + 8) this.addPage();
  }

  kicker(text: string) {
    this.ensure(18);
    this.page.drawText(text.toUpperCase(), {
      x: M.l,
      y: this.y,
      size: 9,
      font: this.bold,
      color: C.brand,
    });
    this.y -= 18;
  }

  title(text: string) {
    const lines = wrap(text, this.bold, 22, WIDTH);
    this.ensure(lines.length * 26 + 8);
    for (const line of lines) {
      this.page.drawText(line, { x: M.l, y: this.y, size: 22, font: this.bold, color: C.ink });
      this.y -= 26;
    }
    this.y -= 6;
  }

  h2(text: string) {
    this.ensure(36);
    this.y -= 10;
    this.page.drawText(text, { x: M.l, y: this.y, size: 13, font: this.bold, color: C.ink });
    this.y -= 8;
    this.page.drawRectangle({ x: M.l, y: this.y, width: 36, height: 2, color: C.brand });
    this.y -= 16;
  }

  para(text: string, size = 10, color = C.muted) {
    const lines = wrap(text, this.regular, size, WIDTH);
    this.ensure(lines.length * (size + 4) + 8);
    for (const line of lines) {
      this.page.drawText(line, { x: M.l, y: this.y, size, font: this.regular, color });
      this.y -= size + 4;
    }
    this.y -= 6;
  }

  heroLogo() {
    if (!this.logo) return;
    const h = 28;
    const w = (this.logo.width / this.logo.height) * h;
    this.ensure(h + 16);
    this.page.drawImage(this.logo, { x: M.l, y: this.y - h + 6, width: w, height: h });
    this.y -= h + 14;
  }

  card(rows: { label: string; value: string }[]) {
    const labelW = 130;
    const valueW = WIDTH - labelW - 24;
    const blocks = rows.map((r) => ({
      label: r.label,
      lines: wrap(r.value, this.regular, 9, valueW),
    }));
    const height = blocks.reduce((n, b) => n + Math.max(18, b.lines.length * 12) + 10, 16);
    this.ensure(height + 8);
    const top = this.y;
    this.page.drawRectangle({
      x: M.l,
      y: top - height,
      width: WIDTH,
      height,
      color: C.surface,
      borderColor: C.line,
      borderWidth: 1,
    });
    let y = top - 16;
    for (const b of blocks) {
      this.page.drawText(b.label.toUpperCase(), {
        x: M.l + 12,
        y,
        size: 8,
        font: this.bold,
        color: C.muted,
      });
      for (const line of b.lines) {
        this.page.drawText(line, {
          x: M.l + 12 + labelW,
          y,
          size: 9,
          font: this.regular,
          color: C.ink,
        });
        y -= 12;
      }
      y -= 8;
    }
    this.y = top - height - 14;
  }

  finding(title: string, confidence: string, summary: string, rule: string) {
    const sum = wrap(summary, this.regular, 10, WIDTH - 24);
    const h = 52 + sum.length * 14;
    this.ensure(h + 8);
    const top = this.y;
    this.page.drawRectangle({
      x: M.l,
      y: top - h,
      width: WIDTH,
      height: h,
      color: C.surface,
      borderColor: C.line,
      borderWidth: 1,
    });
    this.page.drawRectangle({ x: M.l, y: top - h, width: 3, height: h, color: C.brand });
    this.page.drawText(winAnsi(title), { x: M.l + 16, y: top - 18, size: 11, font: this.bold, color: C.ink });
    this.page.drawText(winAnsi(`${confidence}  /  ${rule}`), {
      x: M.l + 16,
      y: top - 32,
      size: 8,
      font: this.regular,
      color: C.brand,
    });
    let y = top - 50;
    for (const line of sum) {
      this.page.drawText(line, { x: M.l + 16, y, size: 10, font: this.regular, color: C.muted });
      y -= 14;
    }
    this.y = top - h - 12;
  }
}

export async function buildBrandedPdf(payload: ReportPayload) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${BRAND.name} analysis report`);
  doc.setAuthor(BRAND.name);
  doc.setSubject(BRAND.trustLine);
  doc.setCreator(BRAND.name);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: PDFImage | null = null;
  const logoPath = logoFile();
  if (existsSync(logoPath)) {
    logo = await doc.embedPng(readFileSync(logoPath));
  }
  const r = new DarkReport(doc, regular, bold, logo);
  r.start();
  r.heroLogo();
  r.kicker(BRAND.kicker);
  r.title(payload.executive.classification);
  r.para(payload.executive.summary, 11, C.ink);
  r.para(BRAND.trustLine, 9);

  r.card([
    { label: "Report ID", value: payload.report_id },
    { label: "Evidence ID", value: payload.evidence_id },
    { label: "Confidence", value: String(payload.executive.confidence) },
    { label: "Acquisition (UTC)", value: payload.acquisition_time_utc },
    { label: "Ruleset", value: payload.ruleset_version },
  ]);

  r.h2("Acquisition");
  r.para(payload.acquisition_statement, 10, C.ink);

  r.h2("Per-category confidence");
  r.card(
    Object.entries(payload.per_category_confidence).map(([k, v]) => ({
      label: k,
      value: String(v),
    })),
  );

  r.h2("Findings");
  for (const finding of Object.values(payload.findings)) {
    r.finding(finding.classification, String(finding.confidence), finding.summary, finding.rule_id);
  }

  r.h2("Timeline");
  if (!payload.timeline.length) {
    r.para("No dated events were recorded. A single capture time is not shown.");
  } else {
    r.card(
      payload.timeline.map((t) => ({
        label: t.field,
        value: `${t.value} (${t.zone}${t.anomaly ? `; ${t.anomaly}` : ""})`,
      })),
    );
  }

  r.h2("Provenance");
  r.card([
    { label: "Content Credentials", value: payload.provenance.state.replaceAll("_", " ") },
    { label: "Signer", value: payload.provenance.signer ?? "-" },
    { label: "Claim generator", value: payload.provenance.claim_generator ?? "-" },
    { label: "Signed at", value: payload.provenance.signed_at ?? "-" },
    { label: "AI assertion", value: payload.provenance.ai_assertion ?? "-" },
  ]);

  r.h2("AI analysis");
  r.finding(
    payload.ai_analysis.classification,
    String(payload.ai_analysis.confidence),
    payload.ai_analysis.summary,
    payload.ai_analysis.rule_id,
  );

  r.h2("File identity");
  const id = payload.identity;
  r.card(
    [
      { label: "Detected type", value: id.detected_type },
      { label: "Bytes", value: String(id.byte_size) },
      { label: "Dimensions", value: id.width && id.height ? `${id.width} x ${id.height}` : "-" },
      { label: "Aspect", value: id.aspect_ratio ?? "-" },
      { label: "Colour space", value: id.colour_space ?? "-" },
      { label: "SHA-256", value: id.sha256 },
      { label: "pHash", value: id.phash ?? "-" },
      id.file_name ? { label: "File name", value: id.file_name } : null,
      payload.gps
        ? { label: "Coordinates", value: `${payload.gps.lat}, ${payload.gps.lng}` }
        : { label: "GPS", value: "Redacted unless revealed" },
    ].filter((row): row is { label: string; value: string } => Boolean(row)),
  );

  r.h2("Evidence");
  for (const ev of payload.evidence) {
    r.card([
      { label: "Signal", value: ev.signal },
      { label: "Value", value: ev.value },
      { label: "Source", value: `${ev.source} / ${ev.producer}` },
      { label: "Tier", value: `${ev.tier} / ${ev.strength}` },
    ]);
  }

  r.h2("Limitations");
  r.para(payload.limitations, 10, C.ink);
  r.para(payload.what_this_does_not_establish, 10, C.ink);
  r.para(payload.legal_disclaimer, 10, C.muted);

  r.h2("Versions");
  r.card([
    { label: "Analyzer", value: JSON.stringify(payload.analyzer_versions) },
    { label: "Ruleset", value: payload.ruleset_version },
    { label: "Trust list", value: payload.trust_list_version ?? "-" },
  ]);

  return Buffer.from(await doc.save());
}
