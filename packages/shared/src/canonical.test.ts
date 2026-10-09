import { describe, expect, it } from "vitest";
import { canonicalJson, hammingHex } from "./canonical.js";

describe("canonicalJson", () => {
  it("sorts keys and drops undefined", () => {
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
    expect(canonicalJson({ a: { d: 1, c: 2 } })).toBe('{"a":{"c":2,"d":1}}');
  });
});

describe("hammingHex", () => {
  it("counts differing bits", () => {
    expect(hammingHex("00", "00")).toBe(0);
    expect(hammingHex("01", "00")).toBe(1);
  });
});
