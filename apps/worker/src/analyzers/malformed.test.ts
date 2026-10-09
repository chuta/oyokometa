import { describe, expect, it } from "vitest";
import { analyzeStructure } from "./structure.js";

describe("malformed files (QA-8)", () => {
  it("random bytes do not throw in structure analyzer", () => {
    const buf = Buffer.alloc(200, 0x41);
    expect(() => analyzeStructure(buf, "image/jpeg")).not.toThrow();
    expect(() => analyzeStructure(buf, "image/png")).not.toThrow();
  });

  it("empty buffer is safe", () => {
    expect(() => analyzeStructure(Buffer.alloc(0), "image/jpeg")).not.toThrow();
  });
});
