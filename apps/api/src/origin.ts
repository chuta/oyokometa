/** Canonical public web origin for links in emails, QR codes, and verify URLs. */
export function publicAppOrigin(): string {
  const auth = process.env.AUTH_URL?.trim();
  if (auth) return auth.replace(/\/$/, "");
  const first = (process.env.WEB_ORIGIN ?? "http://localhost:3000").split(",")[0]?.trim();
  return (first || "http://localhost:3000").replace(/\/$/, "");
}
