import { describe, expect, it } from "vitest";
import { analyzeStructure } from "./structure.js";

describe("structure", () => {
  it("does not hang on truncated JPEG", () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xd9, 0x00, 0x01]);
    const r = analyzeStructure(buf, "image/jpeg");
    expect(r.trailingBytes).toBe(2);
  });

  it("reads PNG chunk types", () => {
    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdrLen = Buffer.alloc(4);
    ihdrLen.writeUInt32BE(0);
    const ihdr = Buffer.concat([ihdrLen, Buffer.from("IHDR"), Buffer.alloc(4)]);
    const iendLen = Buffer.alloc(4);
    const iend = Buffer.concat([iendLen, Buffer.from("IEND"), Buffer.alloc(4)]);
    const buf = Buffer.concat([sig, ihdr, iend, Buffer.from([1, 2, 3])]);
    const r = analyzeStructure(buf, "image/png");
    expect(r.pngChunks).toContain("IHDR");
    expect(r.pngChunks).toContain("IEND");
    expect(r.trailingBytes).toBe(3);
  });
});
