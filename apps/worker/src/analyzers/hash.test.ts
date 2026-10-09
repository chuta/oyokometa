import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sha256, perceptualHash, hammingHex } from "./hash.js";

async function jpeg(n = 8) {
  return sharp({
    create: { width: n, height: n, channels: 3, background: { r: 40, g: 80, b: 120 } },
  })
    .jpeg()
    .toBuffer();
}

describe("hash", () => {
  it("SHA-256 matches independent tool", async () => {
    const buf = await jpeg();
    expect(sha256(buf)).toBe(createHash("sha256").update(buf).digest("hex"));
  });

  it("pHash is stable and 64-bit hex", async () => {
    const buf = await jpeg(64);
    const a = await perceptualHash(buf);
    const b = await perceptualHash(buf);
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(hammingHex(a, a)).toBe(0);
  });
});
