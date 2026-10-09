import { describe, expect, it } from "vitest";
import { gateResult } from "./benchmark.js";

describe("benchmark gate", () => {
  it("fails until thresholds are met", () => {
    expect(
      gateResult({ strongFpOnGenuine: 0.02, rule9FpOnGenuine: 0, strongRecallOnAi: 0.9 }).pass,
    ).toBe(false);
  });
  it("passes at the PRD thresholds", () => {
    expect(
      gateResult({ strongFpOnGenuine: 0.01, rule9FpOnGenuine: 0.005, strongRecallOnAi: 0.8 }).pass,
    ).toBe(true);
  });
});
