import { describe, expect, it } from "vitest";
import { detectMagic } from "./index.js";

describe("magic bytes", () => {
  it("detects JPEG", () => {
    const buf = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(detectMagic(buf).mime).toBe("image/jpeg");
  });
  it("detects PNG", () => {
    const buf = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(detectMagic(buf).mime).toBe("image/png");
  });
  it("rejects empty", () => {
    expect(detectMagic(new Uint8Array(4)).mime).toBeNull();
  });
});
