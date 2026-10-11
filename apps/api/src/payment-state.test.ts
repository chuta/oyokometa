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

describe("bachs payment states", () => {
  it("grants from an open or expired checkout and not twice", () => {
    expect(nextPaymentStatus("checkout_open", "bachs_paid")).toBe("paid");
    expect(nextPaymentStatus("expired", "bachs_paid")).toBe("paid");
    expect(nextPaymentStatus("paid", "bachs_paid")).toBeNull();
    expect(grantsCredits("bachs_paid")).toBe(true);
    expect(grantsCredits("user_claim")).toBe(false);
  });

  it("expires only an open checkout, and a later payment can still be granted", () => {
    expect(nextPaymentStatus("checkout_open", "bachs_expire")).toBe("expired");
    expect(nextPaymentStatus("paid", "bachs_expire")).toBeNull();
    expect(nextPaymentStatus("expired", "bachs_paid")).toBe("paid");
  });

  it("reverses only a paid Bachs payment", () => {
    expect(nextPaymentStatus("paid", "bachs_reverse")).toBe("reversed");
    expect(nextPaymentStatus("checkout_open", "bachs_reverse")).toBeNull();
    expect(nextPaymentStatus("checkout_open", "admin_confirm")).toBeNull();
  });
});
