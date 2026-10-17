import { describe, expect, it } from "vitest";
import { parseFeedback } from "./feedback.js";

function base(overrides: Record<string, unknown> = {}) {
  return {
    idempotency_key: "fb-12345678",
    name: "Ada Okonkwo",
    email: "Ada@Example.com",
    message: "The report was clear, and I could follow the limits.",
    ...overrides,
  };
}

describe("parseFeedback", () => {
  it("accepts a short note and lowercases the email", () => {
    const parsed = parseFeedback(base());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.email).toBe("ada@example.com");
    expect(parsed.value.name).toBe("Ada Okonkwo");
  });

  it("rejects a note that is too short", () => {
    expect(parseFeedback(base({ message: "Thanks" })).ok).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(parseFeedback(base({ website_confirm: "https://spam.example" })).ok).toBe(false);
  });
});
