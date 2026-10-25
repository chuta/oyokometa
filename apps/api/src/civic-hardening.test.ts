import { describe, expect, it } from "vitest";
import { captureRequiresHold, requestCanAcceptFrame } from "./capture.js";
import {
  CIVIC_LIMITS,
  CIVIC_PUBLIC_FIELDS,
  canPublishCivicCase,
  canReadCivicCase,
  canRequestCivicCapture,
  canSeeContributorIdentity,
  civicAuditMetadata,
  contributorCanOpen,
  parseCivicAppeal,
  parseCivicPublication,
  parseCivicSubmission,
  plainCivicText,
  presentCivicVersion,
  safeHttpUrl,
} from "./civic.js";

const gate = {
  contributorId: "contributor-1",
  assignedReviewerId: "reviewer-1",
  workflowStatus: "editor_review" as const,
  sensitivityLevel: "standard",
  identityRestricted: true,
  publicationState: "private",
  hasPublicVersion: false,
};

describe("civic hardening", () => {
  it("does not let a guessed id, another user, or an admin read a private case", () => {
    expect(canReadCivicCase({ id: "other", role: "user" }, gate)).toBe(false);
    expect(canReadCivicCase({ id: "admin-1", role: "admin" }, gate)).toBe(false);
    expect(canReadCivicCase(null, gate)).toBe(false);
    expect(
      contributorCanOpen({
        userId: "other",
        anonSessionId: "other",
        receiptToken: "guess",
        contributorId: "contributor-1",
        contributorSessionId: "anon-1",
        receiptTokenHash: "abc",
      }),
    ).toBe(false);
  });

  it("blocks role escalation on publish, capture, and identity", () => {
    const editor = { id: "editor-1", role: "editor" };
    expect(canPublishCivicCase(editor, gate)).toBe(true);
    expect(canPublishCivicCase({ id: "reviewer-1", role: "reviewer" }, gate)).toBe(false);
    expect(canPublishCivicCase({ id: "admin-1", role: "admin" }, gate)).toBe(false);
    expect(canRequestCivicCapture({ id: "contributor-1", role: "user" }, gate)).toBe(false);
    expect(canSeeContributorIdentity({ id: "reviewer-1", role: "reviewer" }, gate)).toBe(false);
  });

  it("keeps capture paid unless a case id is set, and a used link cannot take another frame", () => {
    expect(captureRequiresHold(null)).toBe(true);
    expect(captureRequiresHold("case-id")).toBe(false);
    const now = Date.now();
    expect(requestCanAcceptFrame("completed", new Date(now))).toBe(false);
    expect(requestCanAcceptFrame("cancelled", new Date(now))).toBe(false);
    expect(requestCanAcceptFrame("expired", new Date(now))).toBe(false);
    expect(requestCanAcceptFrame("refused", new Date(now))).toBe(false);
  });

  it("strips stored markup and rejects unsafe URLs", () => {
    expect(plainCivicText("<script>alert(1)</script>This photo is said to show a rally in Lagos.", 4000)).toBe(
      "alert(1) This photo is said to show a rally in Lagos.",
    );
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("https://user:pass@example.com/a")).toBeNull();
    expect(
      parseCivicSubmission({
        case_type: "viral_media",
        idempotency_key: "idem-key-1",
        claim_text: "<b>This photo is said to show yesterday's rally in Lagos.</b>",
        source_url: "https://example.com/post",
        consent: true,
      }).ok,
    ).toBe(true);
    expect(
      parseCivicPublication(
        {
          idempotency_key: "publish-key-1",
          assessment: "inconclusive",
          rationale: "The available posts do not settle whether the rally took place as described.",
          claim_text: "This photo is said to show yesterday's rally in Lagos.",
          conclusion: "The reviewed evidence does not settle the claim as stated.",
          evidence_summary: "A still image and a public post were compared with independent reports.",
          limitations: "A matching file record does not show that the event happened as claimed.",
          contributor_email: "hidden@example.com",
        },
        "publish",
      ).ok,
    ).toBe(false);
  });

  it("keeps the public payload to an allowlist and drops secrets from audit metadata", () => {
    expect(CIVIC_PUBLIC_FIELDS).toEqual([
      "claim_text",
      "conclusion",
      "evidence_summary",
      "limitations",
      "methodology",
      "location_text",
      "conflict_note",
      "sources",
      "technical",
    ]);
    const meta = civicAuditMetadata({
      version_number: 1,
      assessment: "inconclusive",
      receipt_token: "secret",
      contributor_email: "a@b.com",
      latitude: 6.5,
    });
    expect(meta).toEqual({ version_number: 1, assessment: "inconclusive" });
    const page = presentCivicVersion({
      reference: "OKM-EABC23456",
      versionNumber: 1,
      publishedAt: new Date("2026-10-25T12:00:00.000Z"),
      firstPublishedAt: new Date("2026-10-25T12:00:00.000Z"),
      assessment: "inconclusive",
      rationale: "The available posts do not settle whether the rally took place as described.",
      changeReason: "Initial publication",
      payload: {
        claim_text: "This photo is said to show yesterday's rally in Lagos.",
        conclusion: "The reviewed evidence does not settle the claim as stated.",
        evidence_summary: "A still image and a public post were compared with independent reports.",
        limitations: "A matching file record does not show that the event happened as claimed.",
        methodology: "A person reviewed the claim.",
        location_text: "Lagos",
        conflict_note: null,
        sources: [{ title: "Public post", url: "https://example.com/post", context: null }],
        technical: [{ tier: "Verified", statement: "The still image matches the signed capture record." }],
      },
      history: [],
      current: true,
    });
    const blob = JSON.stringify(page);
    expect(blob).not.toMatch(/contributor|latitude|user_agent|receipt|token/i);
    expect(page.technical[0]?.tier).toBe("Verified");
  });

  it("caps public intake, notes, appeals, and reads", () => {
    expect(CIVIC_LIMITS.intakePerHour).toBe(5);
    expect(CIVIC_LIMITS.notesPerHour).toBe(10);
    expect(CIVIC_LIMITS.appealsPerHour).toBe(5);
    expect(CIVIC_LIMITS.publicReadPerHour).toBe(120);
    expect(CIVIC_LIMITS.receiptReadPerHour).toBe(30);
    expect(parseCivicAppeal({ reason: "<img src=x onerror=alert(1)>The date on the page is wrong.", idempotency_key: "appeal-key-1" }).ok).toBe(
      true,
    );
  });
});
