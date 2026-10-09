import { BRAND, brandLogoUrl } from "./brand.js";
import { publicAppOrigin } from "./origin.js";

export type MailDetail = { label: string; value: string };

export type MailBody = {
  to: string;
  subject: string;
  heading: string;
  kicker?: string;
  preheader?: string;
  paragraphs: string[];
  details?: MailDetail[];
  ctaLabel?: string;
  ctaUrl?: string;
};

export function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderHtml(mail: MailBody) {
  const { hex, fonts, name, tagline, trustLine } = BRAND;
  const kicker = mail.kicker ?? BRAND.kicker;
  const preheader = mail.preheader ?? mail.paragraphs[0] ?? "";
  const logo = brandLogoUrl();
  const paras = mail.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;line-height:1.55;color:${hex.ink};font-size:16px">${escapeHtml(p)}</p>`,
    )
    .join("");
  const details = mail.details?.length
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;border:1px solid ${hex.line};background:${hex.surface}">
        ${mail.details
          .map(
            (row, i) => `<tr>
              <td style="padding:12px 16px;border-top:${i === 0 ? "0" : `1px solid ${hex.line}`};width:34%;color:${hex.muted};font-size:12px;letter-spacing:.04em;text-transform:uppercase">${escapeHtml(row.label)}</td>
              <td style="padding:12px 16px;border-top:${i === 0 ? "0" : `1px solid ${hex.line}`};color:${hex.ink};font-family:${fonts.mono};font-size:14px;word-break:break-all">${escapeHtml(row.value)}</td>
            </tr>`,
          )
          .join("")}
      </table>`
    : "";
  const cta = mail.ctaUrl
    ? `<p style="margin:8px 0 12px">
         <a href="${escapeHtml(mail.ctaUrl)}" style="display:inline-block;background:${hex.brand};color:${hex.onBrand};text-decoration:none;font-weight:600;font-family:${fonts.sans};padding:12px 18px">${escapeHtml(mail.ctaLabel ?? "Open")}</a>
       </p>
       <p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${hex.muted};word-break:break-all;font-family:${fonts.mono}">${escapeHtml(mail.ctaUrl)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(mail.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${hex.bg};color:${hex.ink};font-family:${fonts.sans}">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${hex.bg}">
    <tr><td style="padding:32px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto">
        <tr>
          <td style="padding:0 0 20px">
            <img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" width="180" style="display:block;height:auto;border:0">
          </td>
        </tr>
        <tr>
          <td style="background:${hex.bg2};border:1px solid ${hex.line}">
            <div style="height:3px;background:${hex.brand};line-height:3px;font-size:0">&nbsp;</div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="padding:28px 28px 8px">
                  <p style="margin:0 0 10px;color:${hex.brand};font-size:11px;letter-spacing:.16em;text-transform:uppercase;font-weight:500">${escapeHtml(kicker)}</p>
                  <h1 style="margin:0 0 18px;color:${hex.ink};font-family:${fonts.display};font-size:28px;line-height:1.15;letter-spacing:-0.03em;font-weight:600">${escapeHtml(mail.heading)}</h1>
                  ${paras}
                  ${details}
                  ${cta}
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:22px 4px 0;color:${hex.muted};font-size:12px;line-height:1.55">
            <p style="margin:0 0 8px">${escapeHtml(tagline)}</p>
            <p style="margin:0 0 12px">${escapeHtml(trustLine)}</p>
            <p style="margin:0">
              <a href="${escapeHtml(publicSite("/terms"))}" style="color:${hex.muted}">Terms</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(publicSite("/privacy"))}" style="color:${hex.muted}">Privacy</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(publicSite("/abuse"))}" style="color:${hex.muted}">Report abuse</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function publicSite(path: string) {
  return `${publicAppOrigin()}${path}`;
}

export function renderText(mail: MailBody) {
  const kicker = mail.kicker ?? BRAND.kicker;
  const lines = [BRAND.name, kicker, "", mail.heading, "", ...mail.paragraphs];
  if (mail.details?.length) {
    lines.push("");
    for (const row of mail.details) lines.push(`${row.label}: ${row.value}`);
  }
  if (mail.ctaUrl) lines.push("", mail.ctaLabel ?? "Open", mail.ctaUrl);
  lines.push("", BRAND.tagline, BRAND.trustLine);
  return lines.join("\n");
}
