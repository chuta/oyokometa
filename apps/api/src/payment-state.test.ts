import { describe, expect, it } from "vitest";
import { grantsCredits, nextPaymentStatus } from "./payment-state.js";

describe("bank transfer payment states", () => {
  it("user claim moves to awaiting_match and never grants credits", () => {
    expect(nextPaymentStatus("awaiting_transfer", "user_claim")).toBe("awaiting_match");
    expect(grantsCredits("user_claim")).toBe(false);
  });

  it("user cannot claim twice or claim a settled payment", () => {
    expect(nextPaymentStatus("awaiting_match", "user_claim")).toBeNull();
    expect(nextPaymentStatus("paid", "user_claim")).toBeNull();
    expect(nextPaymentStatus("rejected", "user_claim")).toBeNull();
  });

  it("only admin confirm grants, and only once", () => {
    expect(nextPaymentStatus("awaiting_match", "admin_confirm")).toBe("paid");
    expect(nextPaymentStatus("awaiting_transfer", "admin_confirm")).toBe("paid");
    expect(nextPaymentStatus("paid", "admin_confirm")).toBeNull();
    expect(grantsCredits("admin_confirm")).toBe(true);
  });

  it("rejected payments cannot be confirmed later", () => {
    expect(nextPaymentStatus("awaiting_match", "admin_reject")).toBe("rejected");
    expect(nextPaymentStatus("rejected", "admin_confirm")).toBeNull();
  });

  it("only paid payments can be reversed", () => {
    expect(nextPaymentStatus("paid", "admin_reverse")).toBe("reversed");
    expect(nextPaymentStatus("awaiting_match", "admin_reverse")).toBeNull();
  });
});
