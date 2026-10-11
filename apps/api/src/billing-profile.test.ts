import { describe, expect, it } from "vitest";
import { parseBillingProfile } from "./billing-profile.js";

describe("billing profile", () => {
  it("accepts a blank profile", () => {
    const parsed = parseBillingProfile({
      name: "  ",
      phone_number: "",
      billing_address: { line1: "", line2: "", city: "", state: "", postal_code: "", country: "" },
    });
    expect(parsed).toEqual({ ok: true, value: { name: null, phone: null, billing: null } });
  });

  it("keeps a name, an E.164 phone, and a full address", () => {
    const parsed = parseBillingProfile({
      name: " Ada Lovelace ",
      phone_number: "+234 801 234 5678",
      billing_address: {
        line1: "40 Yaba Road",
        line2: "",
        city: "Lagos",
        state: "Lagos",
        postal_code: "101245",
        country: "ng",
      },
    });
    expect(parsed).toEqual({
      ok: true,
      value: {
        name: "Ada Lovelace",
        phone: "+2348012345678",
        billing: {
          line1: "40 Yaba Road",
          line2: null,
          city: "Lagos",
          state: "Lagos",
          postal_code: "101245",
          country: "NG",
        },
      },
    });
  });

  it("rejects a phone without a country code", () => {
    const parsed = parseBillingProfile({ name: "Ada", phone_number: "08012345678", billing_address: null });
    expect(parsed.ok).toBe(false);
  });

  it("rejects a partial address and the UK alias", () => {
    expect(parseBillingProfile({ name: null, phone_number: null, billing_address: { city: "Lagos" } }).ok).toBe(false);
    expect(
      parseBillingProfile({
        name: null,
        phone_number: null,
        billing_address: { line1: "1 Road", country: "UK" },
      }).ok,
    ).toBe(false);
  });
});
