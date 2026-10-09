import { createHash } from "node:crypto";
import sharp from "sharp";

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** 64-bit DCT pHash (AN-9). */
export async function perceptualHash(buf: Buffer): Promise<string> {
  const raw = await sharp(buf, { failOn: "none", limitInputPixels: 100_000_000 })
    .rotate()
    .resize(32, 32, { fit: "fill" })
    .greyscale()
    .raw()
    .toBuffer();
  const pixels = new Array(32 * 32);
  for (let i = 0; i < pixels.length; i++) pixels[i] = raw[i] ?? 0;
  const dct = dct2d(pixels, 32);
  const low = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (x === 0 && y === 0) continue;
      low.push(dct[y * 32 + x] ?? 0);
    }
  }
  const median = [...low].sort((a, b) => a - b)[Math.floor(low.length / 2)] ?? 0;
  let bits = 0n;
  for (let i = 0; i < 64; i++) {
    const v = low[i] ?? 0;
    if (v > median) bits |= 1n << BigInt(i);
  }
  return bits.toString(16).padStart(16, "0");
}

export function hammingHex(a: string, b: string): number {
  const x = BigInt(`0x${a}`) ^ BigInt(`0x${b}`);
  let n = 0;
  let v = x;
  while (v) {
    n += Number(v & 1n);
    v >>= 1n;
  }
  return n;
}

function dct1d(input: number[]): number[] {
  const n = input.length;
  const out = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (input[i] ?? 0) * Math.cos(((2 * i + 1) * k * Math.PI) / (2 * n));
    }
    out[k] = (k === 0 ? 1 / Math.sqrt(n) : Math.sqrt(2 / n)) * sum;
  }
  return out;
}

function dct2d(pixels: number[], n: number): number[] {
  const rows: number[][] = [];
  for (let y = 0; y < n; y++) {
    rows.push(dct1d(pixels.slice(y * n, y * n + n)));
  }
  const out = new Array(n * n).fill(0);
  for (let x = 0; x < n; x++) {
    const col = dct1d(rows.map((r) => r[x] ?? 0));
    for (let y = 0; y < n; y++) out[y * n + x] = col[y] ?? 0;
  }
  return out;
}
