import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";

const api = "http://localhost:4000";
const cookieFile = join(tmpdir(), "okm-cookies.txt");
const jpegPath = join(tmpdir(), "okm-test.jpg");
const buf = await sharp({
  create: { width: 64, height: 48, channels: 3, background: { r: 90, g: 110, b: 80 } },
}).jpeg().toBuffer();
writeFileSync(jpegPath, buf);

async function req(path, opts = {}) {
  const headers = new Headers(opts.headers);
  const cookie = globalThis.__cookie;
  if (cookie) headers.set("cookie", cookie);
  const res = await fetch(api + path, { ...opts, headers });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) globalThis.__cookie = set.map((c) => c.split(";")[0]).join("; ");
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

const up = await req("/api/v1/uploads", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    filename: "okm-test.jpg",
    content_type: "image/jpeg",
    byte_size: buf.length,
  }),
});
console.log("uploads", up.status, up.json);
if (!up.json.asset_id) process.exit(1);

const put = await req(up.json.upload_url.replace(api, ""), {
  method: "PUT",
  headers: { "content-type": "image/jpeg" },
  body: buf,
});
console.log("put", put.status, put.json);

const job = await req("/api/v1/analyses", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "Idempotency-Key": `smoke-${Date.now()}`,
  },
  body: JSON.stringify({ asset_id: up.json.asset_id, tier: "quick" }),
});
console.log("job", job.status, { id: job.json.id, status: job.json.status, error: job.json.error });
if (!job.json.id) process.exit(1);

for (let i = 0; i < 20; i++) {
  await new Promise((r) => setTimeout(r, 700));
  const st = await req(`/api/v1/analyses/${job.json.id}`);
  console.log("poll", st.json.status, st.json.stage, st.json.error_code ?? "");
  if (st.json.status === "completed") {
    console.log("executive", st.json.findings?.executive);
    process.exit(0);
  }
  if (st.json.status === "failed") {
    console.error("failed", st.json);
    process.exit(1);
  }
}
console.error("timeout");
process.exit(1);
void cookieFile;
void jpegPath;
