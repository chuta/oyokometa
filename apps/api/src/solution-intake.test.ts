import { describe, expect, it } from "vitest";
import { parseSolutionIntake } from "./solution-intake.js";

function base(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: "req-12345678",
    contact_name: "Ada Okonkwo",
    email: "ada@example.com",
    organization_name: "Example News",
    job_title: "Editor",
    country: "Nigeria",
    contact_method: "email",
    organization_type: "newsroom",
    services: ["ai-detection"],
    needs: ["ai-image"],
    problem: "We receive images with stories and have no consistent way to record what was checked.",
    privacy_ack: true,
    marketing_consent: false,
    contact_consent: true,
    ...overrides,
  };
}

describe("parseSolutionIntake", () => {
  it("accepts a complete request and keeps marketing consent separate", () => {
    const parsed = parseSolutionIntake(base());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.email).toBe("ada@example.com");
    expect(parsed.value.services).toEqual(["ai-detection"]);
    expect(parsed.value.marketingConsent).toBe(false);
    expect(parsed.value.contactConsent).toBe(true);
  });

  it("allows optional commercial fields to be blank", () => {
    const parsed = parseSolutionIntake(base({ budget_range: "", currency: null, phone: "" }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.budgetRange).toBeNull();
    expect(parsed.value.phone).toBeNull();
  });

  it("rejects a short problem, an unknown service, a honeypot, and a missing privacy acknowledgement", () => {
    expect(parseSolutionIntake(base({ problem: "Too short" })).ok).toBe(false);
    expect(parseSolutionIntake(base({ services: ["hive"] })).ok).toBe(false);
    expect(parseSolutionIntake(base({ website_confirm: "spam" })).ok).toBe(false);
    expect(parseSolutionIntake(base({ privacy_ack: false })).ok).toBe(false);
  });

  it("asks for a phone number only when phone is the contact method", () => {
    expect(parseSolutionIntake(base({ contact_method: "phone" })).ok).toBe(false);
    const parsed = parseSolutionIntake(base({ contact_method: "phone", phone: "+2348000000000" }));
    expect(parsed.ok).toBe(true);
  });
});
