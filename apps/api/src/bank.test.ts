import { describe, expect, it } from "vitest";
import { generateTransferReference, formatAmount } from "./bank.js";

describe("bank transfer references", () => {
  it("issues unique OKM- codes suitable as transfer narration", () => {
    const set = new Set(Array.from({ length: 200 }, () => generateTransferReference()));
    expect(set.size).toBe(200);
    for (const r of set) {
      expect(r).toMatch(/^OKM-[A-Z2-9]{8}$/);
    }
  });

  it("formats kobo as NGN", () => {
    expect(formatAmount(500000, "NGN")).toMatch(/NGN/);
    expect(formatAmount(500000, "NGN")).toMatch(/5,000/);
  });
});
