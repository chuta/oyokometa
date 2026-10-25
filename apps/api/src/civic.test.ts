import { describe, expect, it } from "vitest";
import { sha256Hex } from "./crypto.js";
import {
  canAssignCivicCase,
  canCorrectCivicCase,
  canPublishCivicCase,
  canReadCivicCase,
  canRequestCivicCapture,
  canSeeContributorIdentity,
  canTransitionCivicCase,
  canUnpublishCivicCase,
  civicCaptureNotice,
  civicReferenceCode,
  contributorCanOpen,
  parseCivicAppeal,
  parseCivicCaptureRequest,
  parseCivicNote,
  parseCivicPublication,
  parseCivicSubmission,
  presentCivicVersion,
  readCivicPublicPayload,
  safeHttpUrl,
  type CivicCaseGate,
} from "./civic.js";

const contributor = "contributor-1";
const reviewerId = "reviewer-1";
const editorId = "editor-1";

function row(overrides: Partial<CivicCaseGate> = {}): CivicCaseGate {
  return {
    contributorId: contributor,
    assignedReviewerId: reviewerId,
    workflowStatus: "under_review",
    sensitivityLevel: "standard",
    identityRestricted: true,
    ...overrides,
  };
}

describe("civic reference", () => {
  it("uses a non-sequential OKM-E code", () => {
    const code = civicReferenceCode();
    expect(code).toMatch(/^OKM-E[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  });
});

describe("civic case access", () => {
  it("lets the contributor read their case and their own identity", () => {
    const actor = { id: contributor, role: "user" };
    expect(canReadCivicCase(actor, row())).toBe(true);
    expect(canSeeContributorIdentity(actor, row())).toBe(true);
  });

  it("hides the case from another user, support, finance, and an unassigned reviewer", () => {
    expect(canReadCivicCase({ id: "other", role: "user" }, row())).toBe(false);
    expect(canReadCivicCase({ id: "support-1", role: "support" }, row())).toBe(false);
    expect(canReadCivicCase({ id: "finance-1", role: "finance" }, row())).toBe(false);
    expect(canReadCivicCase({ id: "reviewer-2", role: "reviewer" }, row())).toBe(false);
    expect(canReadCivicCase(null, row())).toBe(false);
  });

  it("lets the assigned reviewer read the case without seeing a restricted identity", () => {
    const actor = { id: reviewerId, role: "reviewer" };
    expect(canReadCivicCase(actor, row())).toBe(true);
    expect(canSeeContributorIdentity(actor, row())).toBe(false);
    expect(canSeeContributorIdentity(actor, row({ identityRestricted: false }))).toBe(true);
  });

  it("lets an editor read the editorial queue, not a fresh private case", () => {
    const editor = { id: editorId, role: "editor" };
    expect(canReadCivicCase(editor, row({ workflowStatus: "received", assignedReviewerId: null }))).toBe(false);
    expect(canReadCivicCase(editor, row({ workflowStatus: "editor_review" }))).toBe(true);
    expect(canReadCivicCase(editor, row({ workflowStatus: "published" }))).toBe(true);
  });

  it("lets trust-and-safety read sensitive cases without identity", () => {
    const safety = { id: "safety-1", role: "trust-and-safety" };
    expect(canReadCivicCase(safety, row())).toBe(false);
    expect(canReadCivicCase(safety, row({ sensitivityLevel: "restricted" }))).toBe(true);
    expect(canSeeContributorIdentity(safety, row({ sensitivityLevel: "restricted", identityRestricted: false }))).toBe(false);
  });

  it("enforces a restricted-handling request against unassigned editors and identity", () => {
    const editor = { id: editorId, role: "editor" };
    const assignedEditor = { id: reviewerId, role: "editor" };
    const restricted = row({
      sensitivityLevel: "restricted",
      identityRestricted: false,
      workflowStatus: "editor_review",
      assignedReviewerId: reviewerId,
    });
    expect(canReadCivicCase(editor, restricted)).toBe(false);
    expect(canReadCivicCase(assignedEditor, restricted)).toBe(true);
    expect(canReadCivicCase({ id: "reviewer-2", role: "reviewer" }, restricted)).toBe(false);
    expect(canReadCivicCase({ id: reviewerId, role: "reviewer" }, restricted)).toBe(true);
    expect(canSeeContributorIdentity(assignedEditor, restricted)).toBe(false);
    expect(canPublishCivicCase(editor, { ...restricted, publicationState: "private", hasPublicVersion: false })).toBe(false);
    expect(canPublishCivicCase(assignedEditor, { ...restricted, publicationState: "private", hasPublicVersion: false })).toBe(true);
    expect(canRequestCivicCapture(editor, restricted)).toBe(false);
    expect(canRequestCivicCapture(assignedEditor, restricted)).toBe(true);
  });

  it("lets an admin assign a case without reading it or seeing the contributor", () => {
    const admin = { id: "admin-1", role: "admin" };
    expect(canAssignCivicCase(admin.role)).toBe(true);
    expect(canAssignCivicCase("editor")).toBe(false);
    expect(canAssignCivicCase("reviewer")).toBe(false);
    expect(canReadCivicCase(admin, row())).toBe(false);
    expect(canSeeContributorIdentity(admin, row({ identityRestricted: false }))).toBe(false);
  });
});

describe("civic capture requests", () => {
  const reviewer = { id: reviewerId, role: "reviewer" };
  const editor = { id: editorId, role: "editor" };

  it("lets an assigned reviewer or an editor who can read the case request a photo", () => {
    expect(canRequestCivicCapture(reviewer, row())).toBe(true);
    expect(canRequestCivicCapture(editor, row({ workflowStatus: "editor_review" }))).toBe(true);
    expect(canRequestCivicCapture(editor, row({ workflowStatus: "received", assignedReviewerId: null }))).toBe(false);
  });

  it("refuses a contributor, an admin, trust-and-safety, and a closed case", () => {
    expect(canRequestCivicCapture({ id: contributor, role: "user" }, row())).toBe(false);
    expect(canRequestCivicCapture({ id: "admin-1", role: "admin" }, row())).toBe(false);
    expect(canRequestCivicCapture({ id: "safety-1", role: "trust-and-safety" }, row({ sensitivityLevel: "restricted" }))).toBe(false);
    expect(canRequestCivicCapture({ id: "reviewer-2", role: "reviewer" }, row())).toBe(false);
    expect(canRequestCivicCapture(reviewer, row({ workflowStatus: "closed" }))).toBe(false);
    expect(canRequestCivicCapture(reviewer, row({ workflowStatus: "withdrawn" }))).toBe(false);
    expect(canRequestCivicCapture(reviewer, row({ workflowStatus: "referred" }))).toBe(false);
  });

  it("accepts a purpose without a price", () => {
    const parsed = parseCivicCaptureRequest({
      prompt: "Photograph the notice on the door.",
      idempotency_key: "idem-key-1",
      expected_credits: 25,
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.expiresInHours).toBe(72);
    expect(parsed.value).not.toHaveProperty("expectedCredits");
  });

  it("rejects a short purpose", () => {
    expect(parseCivicCaptureRequest({ prompt: "Hi", idempotency_key: "idem-key-1" }).ok).toBe(false);
  });

  it("shows the purpose and the limits, and leaves the private claim out", () => {
    const notice = civicCaptureNotice("Photograph the notice on the door.");
    const text = JSON.stringify(notice).toLowerCase();
    expect(notice.purpose).toBe("Photograph the notice on the door.");
    expect(notice.decline).toContain("Close this page");
    expect(notice.location.toLowerCase()).toContain("optional");
    expect(text).not.toContain("yesterday's rally");
    expect(text).not.toContain("authentic");
    expect(text).not.toContain("credit");
  });
});

describe("civic workflow transitions", () => {
  const reviewer = { id: reviewerId, role: "reviewer" };
  const editor = { id: editorId, role: "editor" };

  it("lets the assigned reviewer move a case toward a finding, not onto the public page", () => {
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "received" }), "triage")).toBe(true);
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "under_review" }), "proposed_finding")).toBe(true);
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "proposed_finding" }), "editor_review")).toBe(true);
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "editor_review" }), "published")).toBe(false);
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "editor_review" }), "closed")).toBe(false);
  });

  it("lets only an editor publish, return, or reopen", () => {
    expect(canTransitionCivicCase(editor, row({ workflowStatus: "editor_review" }), "published")).toBe(true);
    expect(canTransitionCivicCase(editor, row({ workflowStatus: "editor_review" }), "under_review")).toBe(true);
    expect(canTransitionCivicCase(editor, row({ workflowStatus: "published" }), "reopened")).toBe(true);
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "published" }), "reopened")).toBe(false);
    expect(canTransitionCivicCase({ id: "admin-1", role: "admin" }, row({ workflowStatus: "editor_review" }), "published")).toBe(false);
  });

  it("rejects a skipped status and a contributor status change", () => {
    expect(canTransitionCivicCase(reviewer, row({ workflowStatus: "received" }), "published")).toBe(false);
    expect(canTransitionCivicCase({ id: contributor, role: "user" }, row({ workflowStatus: "received" }), "triage")).toBe(false);
  });

  it("lets trust-and-safety refer or close a sensitive case only", () => {
    const safety = { id: "safety-1", role: "trust-and-safety" };
    const sensitive = row({ sensitivityLevel: "sensitive", workflowStatus: "under_review" });
    expect(canTransitionCivicCase(safety, sensitive, "referred")).toBe(true);
    expect(canTransitionCivicCase(safety, sensitive, "proposed_finding")).toBe(false);
    expect(canTransitionCivicCase(safety, row({ workflowStatus: "under_review" }), "referred")).toBe(false);
  });
});

const submission = {
  case_type: "viral_media",
  idempotency_key: "idem-key-1",
  claim_text: "This photo is said to show yesterday's rally in Lagos.",
  source_url: "https://example.com/post",
  consent: true,
};

describe("civic intake parsing", () => {
  it("accepts a claim with a link and forces a broad location", () => {
    const parsed = parseCivicSubmission({ ...submission, claimed_location_text: "Lagos" });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.locationPrecision).toBe("broad");
    expect(parsed.value.sourceUrl).toBe("https://example.com/post");
    expect(parsed.value.sensitivityLevel).toBe("standard");
    expect(parsed.value.contributorExplanation).toBeNull();
  });

  it("keeps the claim and the contributor explanation as separate fields", () => {
    const parsed = parseCivicSubmission({
      ...submission,
      contributor_explanation: "I saw the same clip last week with a different caption.",
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.claimText).toBe(submission.claim_text);
    expect(parsed.value.contributorExplanation).toBe("I saw the same clip last week with a different caption.");
    expect(parseCivicSubmission({ ...submission, contributor_explanation: submission.claim_text }).ok).toBe(false);
    const alias = parseCivicSubmission({ ...submission, context: "The poster is a known page." });
    expect(alias.ok).toBe(true);
    if (!alias.ok) return;
    expect(alias.value.contributorExplanation).toBe("The poster is a known page.");
    expect(alias.value.claimText).toBe(submission.claim_text);
  });

  it("rejects a missing consent, a script link, and a viral claim with no evidence", () => {
    expect(parseCivicSubmission({ ...submission, consent: false }).ok).toBe(false);
    expect(parseCivicSubmission({ ...submission, source_url: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseCivicSubmission({ ...submission, source_url: "" }).ok).toBe(false);
    expect(safeHttpUrl("https://user:pass@example.com/a")).toBeNull();
  });

  it("requires an election label for a result sheet and a basis for an incident", () => {
    expect(parseCivicSubmission({ ...submission, case_type: "result_sheet", source_url: "https://example.com/a" }).ok).toBe(false);
    expect(
      parseCivicSubmission({
        ...submission,
        case_type: "result_sheet",
        election_or_event: "Not sure",
      }).ok,
    ).toBe(false);
    const sheet = parseCivicSubmission({
      ...submission,
      case_type: "result_sheet",
      election_or_event: "Not sure",
      specific_check: "Compare the accredited-voters figure with the IReV copy.",
    });
    expect(sheet.ok).toBe(true);
    if (sheet.ok) {
      expect(sheet.value.specificCheck).toBe("Compare the accredited-voters figure with the IReV copy.");
      expect(sheet.value.claimText).toBe(submission.claim_text);
    }
    expect(
      parseCivicSubmission({
        ...submission,
        case_type: "result_sheet",
        election_or_event: "Not sure",
        specific_check: submission.claim_text,
      }).ok,
    ).toBe(false);
    expect(
      parseCivicSubmission({
        ...submission,
        case_type: "incident",
        source_url: "",
        incident_category: "violence",
        observation_basis: "witnessed",
        restricted_handling: true,
      }).ok,
    ).toBe(true);
    const incident = parseCivicSubmission({
      ...submission,
      case_type: "incident",
      source_url: "",
      incident_category: "violence",
      observation_basis: "witnessed",
      restricted_handling: true,
    });
    if (!incident.ok) return;
    expect(incident.value.sensitivityLevel).toBe("restricted");
    expect(incident.value.restrictedHandling).toBe(true);
    expect(incident.value.observationBasis).toBe("witnessed");
  });

  it("stores the three observation bases as distinct validated values", () => {
    const base = {
      ...submission,
      case_type: "incident",
      source_url: "",
      incident_category: "obstruction",
    };
    expect(parseCivicSubmission({ ...base, observation_basis: "witnessed" }).ok).toBe(true);
    expect(parseCivicSubmission({ ...base, observation_basis: "told" }).ok).toBe(true);
    expect(parseCivicSubmission({ ...base, observation_basis: "online" }).ok).toBe(true);
    expect(parseCivicSubmission({ ...base }).ok).toBe(false);
    expect(parseCivicSubmission({ ...base, observation_basis: "" }).ok).toBe(false);
    expect(parseCivicSubmission({ ...base, observation_basis: "someone_told_me" }).ok).toBe(false);
    expect(parseCivicSubmission({ ...base, observation_basis: "I witnessed this directly" }).ok).toBe(false);
    const told = parseCivicSubmission({ ...base, observation_basis: "told" });
    expect(told.ok).toBe(true);
    if (!told.ok) return;
    expect(told.value.observationBasis).toBe("told");
    expect(told.value.observationBasis).not.toBe("witnessed");
    expect(told.value.restrictedHandling).toBe(false);
    expect(told.value.sensitivityLevel).toBe("standard");
    const violence = parseCivicSubmission({
      ...base,
      incident_category: "violence",
      observation_basis: "online",
    });
    expect(violence.ok).toBe(true);
    if (!violence.ok) return;
    expect(violence.value.observationBasis).toBe("online");
    expect(violence.value.sensitivityLevel).toBe("sensitive");
    expect(violence.value.restrictedHandling).toBe(false);
  });

  it("opens a receipt for the contributor, the same browser, or a matching token", () => {
    const token = "receipt-token";
    const hash = sha256Hex(token);
    const base = {
      contributorId: contributor,
      contributorSessionId: "anon-1",
      receiptTokenHash: hash,
    };
    expect(contributorCanOpen({ ...base, userId: contributor, anonSessionId: null, receiptToken: null })).toBe(true);
    expect(contributorCanOpen({ ...base, userId: null, anonSessionId: "anon-1", receiptToken: null })).toBe(true);
    expect(contributorCanOpen({ ...base, userId: null, anonSessionId: null, receiptToken: token })).toBe(true);
    expect(contributorCanOpen({ ...base, userId: "other", anonSessionId: "other", receiptToken: "nope" })).toBe(false);
    expect(parseCivicNote({ text: "The caption missed the date.", kind: "error" }).ok).toBe(true);
    expect(parseCivicNote({ text: "short" }).ok).toBe(false);
  });
});

const publication = {
  idempotency_key: "publish-key-1",
  assessment: "inconclusive",
  rationale: "The available posts do not settle whether the rally took place as described.",
  claim_text: "This photo is said to show yesterday's rally in Lagos.",
  conclusion: "The reviewed evidence does not settle the claim as stated.",
  evidence_summary: "A still image and a public post were compared with independent reports.",
  limitations: "A matching file record does not show that the event happened as claimed.",
  methodology: "A person reviewed the claim before this page was published.",
  location_text: "Lagos",
  sources: [{ title: "Public post", url: "https://example.com/post", context: "Posted the day after the claimed event." }],
  technical: [{ tier: "Verified", statement: "The still image matches the signed capture record." }],
};

describe("civic publication", () => {
  const editor = { id: editorId, role: "editor" };
  const gate = {
    contributorId: contributor,
    assignedReviewerId: reviewerId,
    workflowStatus: "editor_review",
    sensitivityLevel: "standard",
    identityRestricted: true,
    publicationState: "private",
    hasPublicVersion: false,
  };

  it("lets only an editor publish from editorial review", () => {
    expect(canPublishCivicCase(editor, gate)).toBe(true);
    expect(canPublishCivicCase({ id: reviewerId, role: "reviewer" }, gate)).toBe(false);
    expect(canPublishCivicCase(editor, { ...gate, workflowStatus: "under_review" })).toBe(false);
    expect(canPublishCivicCase(editor, { ...gate, hasPublicVersion: true })).toBe(false);
  });

  it("lets an editor correct or unpublish a live page", () => {
    const live = { ...gate, workflowStatus: "published", publicationState: "published", hasPublicVersion: true };
    expect(canCorrectCivicCase(editor, live)).toBe(true);
    expect(canUnpublishCivicCase(editor, live)).toBe(true);
    expect(canUnpublishCivicCase(editor, { ...live, publicationState: "unpublished" })).toBe(false);
    expect(canCorrectCivicCase({ id: reviewerId, role: "reviewer" }, live)).toBe(false);
  });

  it("keeps an allowlisted payload and rejects private keys or unsafe links", () => {
    const parsed = parseCivicPublication(publication, "publish");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.location_text).toBe("Lagos");
    expect(parseCivicPublication({ ...publication, latitude: 6.5 }, "publish").ok).toBe(false);
    expect(parseCivicPublication({ ...publication, contributor_email: "a@b.com" }, "publish").ok).toBe(false);
    expect(parseCivicPublication({ ...publication, sources: [{ title: "x", url: "javascript:alert(1)" }] }, "publish").ok).toBe(false);
    expect(parseCivicPublication({ ...publication, change_reason: "short" }, "correct").ok).toBe(false);
    const stored = readCivicPublicPayload(parsed.value);
    expect(stored?.claim_text).toContain("rally in Lagos");
    expect(JSON.stringify(stored)).not.toMatch(/contributor|latitude|token/i);
  });

  it("presents the public page without identity or coordinates", () => {
    const parsed = parseCivicPublication(publication, "publish");
    if (!parsed.ok) return;
    const page = presentCivicVersion({
      reference: "OKM-EABC23456",
      versionNumber: 1,
      publishedAt: new Date("2026-10-25T12:00:00.000Z"),
      firstPublishedAt: new Date("2026-10-25T12:00:00.000Z"),
      assessment: parsed.value.assessment,
      rationale: parsed.value.rationale,
      changeReason: parsed.value.changeReason,
      payload: parsed.value,
      history: [
        {
          version_number: 1,
          published_at: new Date("2026-10-25T12:00:00.000Z"),
          change_reason: "Initial publication",
          assessment: "inconclusive",
          assessment_label: "Inconclusive",
        },
      ],
      current: true,
    });
    expect(page.assessment_label).toBe("Inconclusive");
    expect(page.technical_note).toContain("file record");
    expect(JSON.stringify(page)).not.toMatch(/contributor|user_agent|latitude/i);
    expect(parseCivicAppeal({ reason: "The date on the page is wrong.", idempotency_key: "appeal-key-1" }).ok).toBe(true);
    expect(parseCivicAppeal({ reason: "short", idempotency_key: "appeal-key-1" }).ok).toBe(false);
    expect(parseCivicAppeal({ reason: "The date on the page is wrong.", website_confirm: "bot", idempotency_key: "appeal-key-1" }).ok).toBe(false);
  });
});
