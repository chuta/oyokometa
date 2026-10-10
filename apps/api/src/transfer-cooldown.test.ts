import { describe, expect, it } from "vitest";
import { TRANSFER_COOLDOWN_MS, transferCooldownRemaining, transferWaitLabel } from "./transfer-cooldown.js";

const now = new Date("2026-10-10T12:00:00.000Z");

describe("bank transfer cooldown", () => {
  it("allows the first transfer", () => {
    expect(transferCooldownRemaining(null, now)).toBe(0);
  });

  it("blocks a second transfer until 10 minutes have passed", () => {
    const justNow = new Date(now.getTime() - 30_000);
    expect(transferCooldownRemaining(justNow, now)).toBe(TRANSFER_COOLDOWN_MS - 30_000);
    const nineMinutes = new Date(now.getTime() - 9 * 60 * 1000);
    expect(transferCooldownRemaining(nineMinutes, now)).toBe(60_000);
  });

  it("allows another transfer once 10 minutes have elapsed", () => {
    const exact = new Date(now.getTime() - TRANSFER_COOLDOWN_MS);
    const later = new Date(now.getTime() - TRANSFER_COOLDOWN_MS - 1);
    expect(transferCooldownRemaining(exact, now)).toBe(0);
    expect(transferCooldownRemaining(later, now)).toBe(0);
  });

  it("describes the remaining wait", () => {
    expect(transferWaitLabel(60_000)).toBe("1 minute");
    expect(transferWaitLabel(90_000)).toBe("1 minute 30 seconds");
    expect(transferWaitLabel(8_000)).toBe("8 seconds");
  });
});
