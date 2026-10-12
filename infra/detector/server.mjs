import http from "node:http";
import sharp from "sharp";
import * as ort from "onnxruntime-node";

const PORT = Number(process.env.PORT ?? 8080);
const TOKEN = process.env.DETECTOR_AUTH_TOKEN ?? "";
const MODEL_VERSION = "cf-vit-s-384-onnx-v1.1";
const MEAN = [0.4815, 0.4578, 0.4082];
const STD = [0.2686, 0.2613, 0.2758];
const MAX_BYTES = 26 * 1024 * 1024;

const session = await ort.InferenceSession.create(process.env.MODEL_PATH ?? "/app/model.onnx");
const inputName = session.inputNames[0];
const outputName = session.outputNames[0];

/** Shortest edge to 440, center crop 384, CLIP normalize. Matches the model card. */
export async function pixels(buf) {
  const meta = await sharp(buf, { failOn: "none" }).rotate().metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) throw new Error("image has no dimensions");
  const scale = 440 / Math.min(width, height);
  const resizedW = Math.max(384, Math.round(width * scale));
  const resizedH = Math.max(384, Math.round(height * scale));
  const left = Math.floor((resizedW - 384) / 2);
  const top = Math.floor((resizedH - 384) / 2);
  const raw = await sharp(buf, { failOn: "none" })
    .rotate()
    .resize(resizedW, resizedH, { fit: "fill", kernel: "cubic" })
    .extract({ left, top, width: 384, height: 384 })
    .removeAlpha()
    .raw()
    .toBuffer();
  const out = new Float32Array(3 * 384 * 384);
  for (let i = 0; i < 384 * 384; i++) {
    for (let c = 0; c < 3; c++) {
      out[c * 384 * 384 + i] = (raw[i * 3 + c] / 255 - MEAN[c]) / STD[c];
    }
  }
  return out;
}

async function score(buf) {
  const tensor = new ort.Tensor("float32", await pixels(buf), [1, 3, 384, 384]);
  const output = await session.run({ [inputName]: tensor });
  const logit = Number(output[outputName].data[0]);
  return 1 / (1 + Math.exp(-logit));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BYTES) {
        reject(new Error("too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, model_version: MODEL_VERSION }));
    return;
  }
  if (req.method !== "POST" || req.url !== "/analyze") {
    res.writeHead(404).end();
    return;
  }
  if (TOKEN && req.headers.authorization !== `Bearer ${TOKEN}`) {
    res.writeHead(401).end();
    return;
  }
  try {
    const buf = await readBody(req);
    const started = Date.now();
    const rawScore = await score(buf);
    console.log(JSON.stringify({ msg: "detect", ms: Date.now() - started }));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ raw_score: rawScore, model_version: MODEL_VERSION }));
  } catch (err) {
    console.error(JSON.stringify({ msg: "detect_failed", error: String(err).slice(0, 200) }));
    res.writeHead(400).end();
  }
});

server.listen(PORT, "::", () => {
  console.log(JSON.stringify({ msg: "detector_listen", port: PORT, input: inputName }));
});
