import { describe, expect, it } from "vitest";
import { priceConfirmed } from "./price-check.js";

describe("priceConfirmed", () => {
  it("accepts only the exact current price", () => {
    expect(priceConfirmed(5, 5)).toBe(true);
    expect(priceConfirmed(0, 0)).toBe(true);
    expect(priceConfirmed(4, 5)).toBe(false);
    expect(priceConfirmed(6, 5)).toBe(false);
  });

  it("rejects a missing or non-integer price", () => {
    expect(priceConfirmed(undefined, 5)).toBe(false);
    expect(priceConfirmed("5", 5)).toBe(false);
    expect(priceConfirmed(5.0001, 5)).toBe(false);
  });
});
