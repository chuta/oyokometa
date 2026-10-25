import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const CIVIC_CASE_TYPES = ["viral_media", "result_sheet", "incident", "other"] as const;
export const CIVIC_WORKFLOW_STATUSES = [
  "received",
  "triage",
  "under_review",
  "awaiting_corroboration",
  "awaiting_contributor",
  "proposed_finding",
  "editor_review",
  "published",
  "referred",
  "closed",
  "reopened",
  "withdrawn",
] as const;
export const CIVIC_ASSESSMENTS = [
  "corroborated",
  "contradicted",
  "misleading_context",
  "partly_supported",
  "inconclusive",
  "unable_to_assess",
  "withdrawn",
] as const;
export const CIVIC_ROLES = ["reviewer", "editor"] as const;
export const CIVIC_LIMITS = {
  intakePerHour: 5,
  notesPerHour: 10,
  appealsPerHour: 5,
  publicReadPerHour: 120,
  receiptReadPerHour: 30,
} as const;
export const CIVIC_PUBLIC_FIELDS = [
  "claim_text",
  "conclusion",
  "evidence_summary",
  "limitations",
  "methodology",
  "location_text",
  "conflict_note",
  "sources",
  "technical",
] as const;

export const CIVIC_EDITOR_QUEUE = ["proposed_finding", "editor_review", "published", "reopened", "withdrawn"] as const;
export const CIVIC_CAPTURE_BLOCKED = ["closed", "withdrawn", "referred"] as const;
const EDITOR_QUEUE = new Set<string>(CIVIC_EDITOR_QUEUE);

const TRANSITIONS: Record<string, readonly string[]> = {
  received: ["triage", "referred", "withdrawn"],
  triage: ["under_review", "awaiting_contributor", "awaiting_corroboration", "referred", "closed", "withdrawn"],
  under_review: ["awaiting_corroboration", "awaiting_contributor", "proposed_finding", "referred", "closed"],
  awaiting_corroboration: ["under_review", "proposed_finding", "referred", "closed"],
  awaiting_contributor: ["under_review", "closed", "withdrawn"],
  proposed_finding: ["editor_review", "under_review"],
  editor_review: ["published", "under_review", "closed"],
  published: ["reopened", "withdrawn"],
  referred: ["under_review", "closed", "reopened"],
  closed: ["reopened"],
  reopened: ["under_review", "triage"],
  withdrawn: ["reopened"],
};

export type CivicActor = { id: string; role: string };

export type CivicCaseGate = {
  contributorId: string | null;
  assignedReviewerId: string | null;
  workflowStatus: string;
  sensitivityLevel: string;
  identityRestricted: boolean;
};

export function civicReferenceCode() {
  const bytes = randomBytes(8);
  let out = "OKM-E";
  for (const b of bytes) out += REFERENCE_ALPHABET[b % REFERENCE_ALPHABET.length];
  return out;
}

export function canAssignCivicCase(role: string) {
  return role === "admin";
}

/** A reviewer assigned to an open case, or an editor who can read it, may request a photo. */
export function canRequestCivicCapture(actor: CivicActor | null, row: CivicCaseGate) {
  if (!actor) return false;
  if (actor.role !== "reviewer" && actor.role !== "editor") return false;
  if ((CIVIC_CAPTURE_BLOCKED as readonly string[]).includes(row.workflowStatus)) return false;
  return canReadCivicCase(actor, row);
}

export type CivicCaptureNotice = {
  purpose: string;
  collects: string;
  location: string;
  access: string;
  publication: string;
  decline: string;
  limits: string;
};

/** Public text for the recipient. It is the reviewer's purpose, not the private claim. */
export function civicCaptureNotice(purpose: string): CivicCaptureNotice {
  return {
    purpose,
    collects:
      "The photo, the time it arrives, and what this browser reports about the camera and device. Those reports are not proof of a physical camera.",
    location:
      "Location is optional. It stays off unless you choose to include it. A device location is what the phone reports. It does not show where the camera was pointed.",
    access: "The photo stays with the Oyokometa review of this request. It is not a public post.",
    publication: "Nothing from this page is published on its own. A later public note, if any, is a separate editorial decision.",
    decline: "Close this page to decline. The link stays unused until it expires.",
    limits: "Sending the photo shows that this link was open and that these bytes arrived. It does not show that the scene is what it appears to be.",
  };
}

export type CivicCaptureRequest = {
  prompt: string;
  address: string | null;
  expiresInHours: number;
  idempotencyKey: string;
};

export function parseCivicCaptureRequest(body: unknown): { ok: true; value: CivicCaptureRequest } | { ok: false; message: string } {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const prompt = typeof rec.prompt === "string" ? rec.prompt.trim() : "";
  if (prompt.length < 3) return { ok: false, message: "Describe the photo you need, in a short sentence." };
  if (prompt.length > 500) return { ok: false, message: "Keep the request under 500 characters." };
  const addressRaw = typeof rec.address === "string" ? rec.address.trim() : "";
  if (addressRaw.length > 200) return { ok: false, message: "Keep the address under 200 characters." };
  const hours = rec.expires_in_hours === undefined ? 72 : rec.expires_in_hours;
  if (typeof hours !== "number" || !Number.isInteger(hours) || hours < 1 || hours > 168) {
    return { ok: false, message: "Choose an expiry between 1 and 168 hours." };
  }
  const key = typeof rec.idempotency_key === "string" ? rec.idempotency_key : "";
  if (!KEY_RE.test(key)) return { ok: false, message: "Refresh the page and create the link again." };
  return { ok: true, value: { prompt, address: addressRaw || null, expiresInHours: hours, idempotencyKey: key } };
}

export function canReadCivicCase(actor: CivicActor | null, row: CivicCaseGate) {
  if (!actor) return false;
  if (row.contributorId && actor.id === row.contributorId) return true;
  if (actor.role === "reviewer") return actor.id === row.assignedReviewerId;
  if (actor.role === "editor") return actor.id === row.assignedReviewerId || EDITOR_QUEUE.has(row.workflowStatus);
  if (actor.role === "trust-and-safety") return row.sensitivityLevel === "sensitive" || row.sensitivityLevel === "restricted";
  return false;
}

export function canSeeContributorIdentity(actor: CivicActor | null, row: CivicCaseGate) {
  if (!actor) return false;
  if (row.contributorId && actor.id === row.contributorId) return true;
  if (row.identityRestricted) return false;
  if (actor.role === "reviewer") return actor.id === row.assignedReviewerId;
  if (actor.role === "editor") return canReadCivicCase(actor, row);
  return false;
}

export function canTransitionCivicCase(actor: CivicActor | null, row: CivicCaseGate, to: string) {
  if (!actor) return false;
  const next = TRANSITIONS[row.workflowStatus] ?? [];
  if (!next.includes(to)) return false;
  if (!canReadCivicCase(actor, row)) return false;
  if (row.workflowStatus === "editor_review" || row.workflowStatus === "published") return actor.role === "editor";
  if (to === "reopened") return actor.role === "editor";
  if (actor.role === "trust-and-safety") return to === "referred" || to === "closed";
  if (actor.role === "reviewer") return actor.id === row.assignedReviewerId && to !== "published";
  if (actor.role === "editor") return true;
  return false;
}

const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INCIDENT_CATEGORIES = ["intimidation", "vote_buying", "obstruction", "violence", "campaign_rule", "access", "other"] as const;
const OBSERVATION_BASIS = ["witnessed", "told", "online"] as const;

export type CivicSubmission = {
  caseType: (typeof CIVIC_CASE_TYPES)[number];
  idempotencyKey: string;
  claimText: string;
  title: string;
  sourceUrl: string | null;
  assetId: string | null;
  context: string | null;
  claimedEventAt: Date | null;
  claimedEventTimePrecision: "exact" | "date_only" | "approximate" | "unknown";
  claimedLocationText: string | null;
  locationPrecision: "broad" | "unknown";
  electionOrEvent: string | null;
  state: string | null;
  lga: string | null;
  ward: string | null;
  pollingUnitCode: string | null;
  incidentCategory: string | null;
  observationBasis: string | null;
  sensitivityLevel: "standard" | "sensitive" | "restricted";
  contributorEmail: string | null;
};

export type CivicNote = { text: string; sourceUrl: string | null; kind: "update" | "error" };

function clip(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, max);
}

const PRIVATE_KEY = /latitude|longitude|accuracy|user_?agent|contributor|email|ip_hash|receipt|token|coordinate|device/i;

/** Public and stored civic text is plain. Markup is not kept. */
export function plainCivicText(value: unknown, max: number) {
  const stripped = clip(value, max)
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, max);
}

export function civicAuditMetadata(value: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (PRIVATE_KEY.test(key)) continue;
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") out[key] = child;
  }
  return out;
}

export function safeHttpUrl(value: string) {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (value.length > 2000) return null;
  return url.toString();
}

export function receiptMatches(storedHash: string | null, presented: string | null) {
  if (!storedHash || !presented || presented.length > 200) return false;
  const got = createHash("sha256").update(presented).digest("hex");
  const a = Buffer.from(storedHash);
  const b = Buffer.from(got);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function contributorCanOpen(input: {
  userId: string | null;
  anonSessionId: string | null;
  receiptToken: string | null;
  contributorId: string | null;
  contributorSessionId: string | null;
  receiptTokenHash: string | null;
}) {
  if (input.userId && input.contributorId && input.userId === input.contributorId) return true;
  if (input.anonSessionId && input.contributorSessionId && input.anonSessionId === input.contributorSessionId) return true;
  return receiptMatches(input.receiptTokenHash, input.receiptToken);
}

export function parseCivicSubmission(body: unknown): { ok: true; value: CivicSubmission } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "The submission could not be read." };
  const raw = body as Record<string, unknown>;
  if (clip(raw.website_confirm, 200)) return { ok: false, message: "The submission could not be accepted." };
  if (raw.consent !== true) return { ok: false, message: "Confirm the privacy notice before submitting." };

  const idempotencyKey = clip(raw.idempotency_key, 80);
  if (!KEY_RE.test(idempotencyKey)) return { ok: false, message: "Refresh the page and send the submission again." };

  const caseType = clip(raw.case_type, 40);
  if (!CIVIC_CASE_TYPES.includes(caseType as (typeof CIVIC_CASE_TYPES)[number])) {
    return { ok: false, message: "Choose what you want checked." };
  }

  const claimText = plainCivicText(raw.claim_text, 4000);
  if (claimText.length < 20) return { ok: false, message: "Describe the claim in at least a sentence." };
  const title = claimText.replace(/\s+/g, " ").slice(0, 80);

  const sourceRaw = clip(raw.source_url, 2000);
  const sourceUrl = sourceRaw ? safeHttpUrl(sourceRaw) : null;
  if (sourceRaw && !sourceUrl) return { ok: false, message: "Enter a link that starts with http:// or https://." };

  const assetRaw = clip(raw.asset_id, 80);
  const assetId = assetRaw ? assetRaw : null;
  if (assetId && !UUID_RE.test(assetId)) return { ok: false, message: "Upload the image again." };
  if ((caseType === "viral_media" || caseType === "result_sheet") && !sourceUrl && !assetId) {
    return { ok: false, message: "Add a still image or a link to the post." };
  }

  const context = clip(raw.context, 2000) || null;
  const dateRaw = clip(raw.claimed_event_on, 40);
  let claimedEventAt: Date | null = null;
  let claimedEventTimePrecision: CivicSubmission["claimedEventTimePrecision"] = "unknown";
  if (dateRaw) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { ok: false, message: "Enter the date as YYYY-MM-DD, or leave it unknown." };
    const parsed = new Date(`${dateRaw}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return { ok: false, message: "Enter the date as YYYY-MM-DD, or leave it unknown." };
    claimedEventAt = parsed;
    claimedEventTimePrecision = "date_only";
  }

  const claimedLocationText = clip(raw.claimed_location_text, 200) || null;
  const locationPrecision = claimedLocationText ? "broad" : "unknown";
  const electionOrEvent = clip(raw.election_or_event, 200) || null;
  if (caseType === "result_sheet" && !electionOrEvent) {
    return { ok: false, message: "Name the election, or choose Not sure." };
  }

  const incidentCategory = clip(raw.incident_category, 40) || null;
  const observationBasis = clip(raw.observation_basis, 40) || null;
  if (caseType === "incident") {
    if (!INCIDENT_CATEGORIES.includes(incidentCategory as (typeof INCIDENT_CATEGORIES)[number])) {
      return { ok: false, message: "Choose the kind of incident." };
    }
    if (!OBSERVATION_BASIS.includes(observationBasis as (typeof OBSERVATION_BASIS)[number])) {
      return { ok: false, message: "Say whether you witnessed this, were told, or saw it online." };
    }
  }

  const emailRaw = clip(raw.contributor_email, 200).toLowerCase();
  if (emailRaw && !EMAIL_RE.test(emailRaw)) return { ok: false, message: "Enter a valid email address, or leave it blank." };

  let sensitivityLevel: CivicSubmission["sensitivityLevel"] = "standard";
  if (incidentCategory === "violence") sensitivityLevel = "sensitive";
  if (raw.restricted_handling === true) sensitivityLevel = "restricted";

  return {
    ok: true,
    value: {
      caseType: caseType as CivicSubmission["caseType"],
      idempotencyKey,
      claimText,
      title,
      sourceUrl,
      assetId,
      context,
      claimedEventAt,
      claimedEventTimePrecision,
      claimedLocationText,
      locationPrecision,
      electionOrEvent,
      state: clip(raw.state, 120) || null,
      lga: clip(raw.lga, 120) || null,
      ward: clip(raw.ward, 120) || null,
      pollingUnitCode: clip(raw.polling_unit_code, 120) || null,
      incidentCategory: caseType === "incident" ? incidentCategory : null,
      observationBasis: caseType === "incident" ? observationBasis : null,
      sensitivityLevel,
      contributorEmail: emailRaw || null,
    },
  };
}

export function parseCivicNote(body: unknown): { ok: true; value: CivicNote } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "The note could not be read." };
  const raw = body as Record<string, unknown>;
  const text = plainCivicText(raw.text, 2000);
  if (text.length < 10) return { ok: false, message: "Write at least a sentence." };
  const sourceRaw = clip(raw.source_url, 2000);
  const sourceUrl = sourceRaw ? safeHttpUrl(sourceRaw) : null;
  if (sourceRaw && !sourceUrl) return { ok: false, message: "Enter a link that starts with http:// or https://." };
  const kind = raw.kind === "error" ? "error" : "update";
  return { ok: true, value: { text, sourceUrl, kind } };
}

export const CIVIC_TECHNICAL_TIERS = ["Verified", "Detected", "Inferred", "Declared"] as const;

export const CIVIC_ASSESSMENT_LABEL: Record<(typeof CIVIC_ASSESSMENTS)[number], string> = {
  corroborated: "Corroborated",
  contradicted: "Contradicted",
  misleading_context: "Misleading context",
  partly_supported: "Partly supported",
  inconclusive: "Inconclusive",
  unable_to_assess: "Unable to assess",
  withdrawn: "Withdrawn",
};

export const CIVIC_ASSESSMENT_LINE: Record<(typeof CIVIC_ASSESSMENTS)[number], string> = {
  corroborated: "Available evidence supports the claim as stated.",
  contradicted: "Reliable evidence conflicts with a material part of the claim.",
  misleading_context: "A material part of the claim leaves out the context of the material.",
  partly_supported: "Some of the claim is supported and a material part is not.",
  inconclusive: "The reviewed evidence does not settle the claim.",
  unable_to_assess: "The case cannot be assessed from the evidence in hand.",
  withdrawn: "The finding has been withdrawn.",
};

export const CIVIC_TECHNICAL_NOTE =
  "Verified, Detected, Inferred, and Declared are different kinds of evidence. A verified line is about a file record. It is not a finding that the claim is true.";

const DEFAULT_METHODOLOGY =
  "A person reviews the claim and the evidence before this page is published. A file signature shows that a file matches a record. It does not show that the claim is true.";

export type CivicPublicationGate = CivicCaseGate & {
  publicationState: string;
  hasPublicVersion: boolean;
};

export function canPublishCivicCase(actor: CivicActor | null, row: CivicPublicationGate) {
  if (!actor || actor.role !== "editor") return false;
  if (!canReadCivicCase(actor, row)) return false;
  return row.workflowStatus === "editor_review" && !row.hasPublicVersion;
}

export function canCorrectCivicCase(actor: CivicActor | null, row: CivicPublicationGate) {
  if (!actor || actor.role !== "editor") return false;
  if (!canReadCivicCase(actor, row)) return false;
  return row.workflowStatus === "published" && row.hasPublicVersion;
}

export function canUnpublishCivicCase(actor: CivicActor | null, row: CivicPublicationGate) {
  if (!actor || actor.role !== "editor") return false;
  if (!canReadCivicCase(actor, row)) return false;
  return row.publicationState === "published" && row.hasPublicVersion;
}

export type CivicPublicSource = { title: string; url: string | null; context: string | null };
export type CivicPublicTechnical = { tier: (typeof CIVIC_TECHNICAL_TIERS)[number]; statement: string };

export type CivicPublicPayload = {
  claim_text: string;
  conclusion: string;
  evidence_summary: string;
  limitations: string;
  methodology: string;
  location_text: string | null;
  conflict_note: string | null;
  sources: CivicPublicSource[];
  technical: CivicPublicTechnical[];
};

export type CivicPublication = CivicPublicPayload & {
  assessment: (typeof CIVIC_ASSESSMENTS)[number];
  rationale: string;
  changeReason: string;
  idempotencyKey: string;
};

function hasPrivateKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some((item) => hasPrivateKey(item));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value as Record<string, unknown>).some(([key, child]) => PRIVATE_KEY.test(key) || hasPrivateKey(child));
}

export function parseCivicPublication(
  body: unknown,
  mode: "publish" | "correct",
): { ok: true; value: CivicPublication } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "The public page could not be read." };
  if (hasPrivateKey(body)) return { ok: false, message: "Remove private fields before publishing." };
  const raw = body as Record<string, unknown>;
  const idempotencyKey = clip(raw.idempotency_key, 80);
  if (!KEY_RE.test(idempotencyKey)) return { ok: false, message: "Refresh the page and send the page again." };

  const assessment = clip(raw.assessment, 40);
  if (!CIVIC_ASSESSMENTS.includes(assessment as (typeof CIVIC_ASSESSMENTS)[number])) {
    return { ok: false, message: "Choose an assessment." };
  }
  const rationale = plainCivicText(raw.rationale, 4000);
  if (rationale.length < 40) return { ok: false, message: "Explain the finding in at least a few sentences." };
  const claimText = plainCivicText(raw.claim_text, 4000);
  if (claimText.length < 20) return { ok: false, message: "Quote the claim that this page assesses." };
  const conclusion = plainCivicText(raw.conclusion, 4000);
  if (conclusion.length < 20) return { ok: false, message: "Write the conclusion in plain language." };
  const evidenceSummary = plainCivicText(raw.evidence_summary, 4000);
  if (evidenceSummary.length < 20) return { ok: false, message: "Summarize the evidence that was examined." };
  const limitations = plainCivicText(raw.limitations, 4000);
  if (limitations.length < 20) return { ok: false, message: "Say what this finding does not establish." };
  const methodologyRaw = plainCivicText(raw.methodology, 4000);
  const locationText = plainCivicText(raw.location_text, 200) || null;
  const conflictNote = plainCivicText(raw.conflict_note, 1000) || null;
  const changeRaw = plainCivicText(raw.change_reason, 500);
  if (mode === "correct" && changeRaw.length < 10) return { ok: false, message: "Say what this correction changes." };

  if (raw.sources != null && !Array.isArray(raw.sources)) return { ok: false, message: "Sources could not be read." };
  if (raw.technical != null && !Array.isArray(raw.technical)) return { ok: false, message: "The evidence labels could not be read." };
  const sourceRows = Array.isArray(raw.sources) ? raw.sources : [];
  const technicalRows = Array.isArray(raw.technical) ? raw.technical : [];
  if (sourceRows.length > 12 || technicalRows.length > 12) return { ok: false, message: "Keep the public page to 12 sources and 12 evidence lines." };

  const sources: CivicPublicSource[] = [];
  for (const item of sourceRows) {
    if (!item || typeof item !== "object") return { ok: false, message: "Sources could not be read." };
    const source = item as Record<string, unknown>;
    const title = plainCivicText(source.title, 200);
    if (title.length < 2) return { ok: false, message: "Name each source." };
    const urlRaw = clip(source.url, 2000);
    const url = urlRaw ? safeHttpUrl(urlRaw) : null;
    if (urlRaw && !url) return { ok: false, message: "Enter a link that starts with http:// or https://." };
    const context = plainCivicText(source.context, 500) || null;
    sources.push({ title, url, context });
  }

  const technical: CivicPublicTechnical[] = [];
  for (const item of technicalRows) {
    if (!item || typeof item !== "object") return { ok: false, message: "The evidence labels could not be read." };
    const line = item as Record<string, unknown>;
    const tier = clip(line.tier, 20);
    if (!CIVIC_TECHNICAL_TIERS.includes(tier as (typeof CIVIC_TECHNICAL_TIERS)[number])) {
      return { ok: false, message: "Label each evidence line Verified, Detected, Inferred, or Declared." };
    }
    const statement = plainCivicText(line.statement, 500);
    if (statement.length < 10) return { ok: false, message: "Write what each evidence line shows." };
    technical.push({ tier: tier as CivicPublicTechnical["tier"], statement });
  }

  return {
    ok: true,
    value: {
      assessment: assessment as CivicPublication["assessment"],
      rationale,
      changeReason: changeRaw || "Initial publication",
      idempotencyKey,
      claim_text: claimText,
      conclusion,
      evidence_summary: evidenceSummary,
      limitations,
      methodology: methodologyRaw || DEFAULT_METHODOLOGY,
      location_text: locationText,
      conflict_note: conflictNote,
      sources,
      technical,
    },
  };
}

export type CivicAppealInput = { reason: string; supportingUrl: string | null; idempotencyKey: string };

export function parseCivicAppeal(body: unknown): { ok: true; value: CivicAppealInput } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "The appeal could not be read." };
  const raw = body as Record<string, unknown>;
  if (clip(raw.website_confirm, 200)) return { ok: false, message: "The appeal could not be accepted." };
  const idempotencyKey = clip(raw.idempotency_key, 80);
  if (!KEY_RE.test(idempotencyKey)) return { ok: false, message: "Refresh the page and send the appeal again." };
  const reason = plainCivicText(raw.reason, 4000);
  if (reason.length < 20) return { ok: false, message: "Describe the appeal in at least a sentence." };
  const sourceRaw = clip(raw.supporting_url, 2000);
  const supportingUrl = sourceRaw ? safeHttpUrl(sourceRaw) : null;
  if (sourceRaw && !supportingUrl) return { ok: false, message: "Enter a link that starts with http:// or https://." };
  return { ok: true, value: { reason, supportingUrl, idempotencyKey } };
}

export function parseCivicResolution(body: unknown): { ok: true; value: { status: "accepted" | "rejected"; resolution: string } } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "The decision could not be read." };
  const raw = body as Record<string, unknown>;
  const status = raw.status === "accepted" || raw.status === "rejected" ? raw.status : null;
  if (!status) return { ok: false, message: "Accept or reject the appeal." };
  const resolution = plainCivicText(raw.resolution, 4000);
  if (resolution.length < 20) return { ok: false, message: "Write the decision in at least a sentence." };
  return { ok: true, value: { status, resolution } };
}

export function parseCivicUnpublish(body: unknown): { ok: true; value: { reason: string } } | { ok: false; message: string } {
  if (!body || typeof body !== "object") return { ok: false, message: "The reason could not be read." };
  const reason = plainCivicText((body as Record<string, unknown>).reason, 500);
  if (reason.length < 10) return { ok: false, message: "Say why the page is being unpublished." };
  return { ok: true, value: { reason } };
}

export type CivicPublicHistory = {
  version_number: number;
  published_at: Date;
  change_reason: string;
  assessment: string;
  assessment_label: string;
};

export function civicPublicPayloadOf(pub: CivicPublication): CivicPublicPayload {
  return {
    claim_text: pub.claim_text,
    conclusion: pub.conclusion,
    evidence_summary: pub.evidence_summary,
    limitations: pub.limitations,
    methodology: pub.methodology,
    location_text: pub.location_text,
    conflict_note: pub.conflict_note,
    sources: pub.sources,
    technical: pub.technical,
  };
}

export function readCivicPublicPayload(raw: unknown): CivicPublicPayload | null {
  if (!raw || typeof raw !== "object" || hasPrivateKey(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const claim_text = plainCivicText(rec.claim_text, 4000);
  const conclusion = plainCivicText(rec.conclusion, 4000);
  const evidence_summary = plainCivicText(rec.evidence_summary, 4000);
  const limitations = plainCivicText(rec.limitations, 4000);
  const methodology = plainCivicText(rec.methodology, 4000) || DEFAULT_METHODOLOGY;
  if (claim_text.length < 20 || conclusion.length < 20 || evidence_summary.length < 20 || limitations.length < 20) return null;
  const sources: CivicPublicSource[] = [];
  const technical: CivicPublicTechnical[] = [];
  if (rec.sources != null && !Array.isArray(rec.sources)) return null;
  if (rec.technical != null && !Array.isArray(rec.technical)) return null;
  for (const item of Array.isArray(rec.sources) ? rec.sources : []) {
    if (!item || typeof item !== "object") return null;
    const source = item as Record<string, unknown>;
    const title = plainCivicText(source.title, 200);
    const urlRaw = clip(source.url, 2000);
    const url = urlRaw ? safeHttpUrl(urlRaw) : null;
    if (title.length < 2 || (urlRaw && !url)) return null;
    sources.push({ title, url, context: plainCivicText(source.context, 500) || null });
  }
  for (const item of Array.isArray(rec.technical) ? rec.technical : []) {
    if (!item || typeof item !== "object") return null;
    const line = item as Record<string, unknown>;
    const tier = clip(line.tier, 20);
    const statement = plainCivicText(line.statement, 500);
    if (!CIVIC_TECHNICAL_TIERS.includes(tier as (typeof CIVIC_TECHNICAL_TIERS)[number]) || statement.length < 10) return null;
    technical.push({ tier: tier as CivicPublicTechnical["tier"], statement });
  }
  return {
    claim_text,
    conclusion,
    evidence_summary,
    limitations,
    methodology,
    location_text: plainCivicText(rec.location_text, 200) || null,
    conflict_note: plainCivicText(rec.conflict_note, 1000) || null,
    sources,
    technical,
  };
}

export function presentCivicVersion(input: {
  reference: string;
  versionNumber: number;
  publishedAt: Date;
  firstPublishedAt: Date | null;
  assessment: string;
  rationale: string;
  changeReason: string;
  payload: CivicPublicPayload;
  history: CivicPublicHistory[];
  current: boolean;
}) {
  const assessment = CIVIC_ASSESSMENTS.includes(input.assessment as (typeof CIVIC_ASSESSMENTS)[number])
    ? (input.assessment as (typeof CIVIC_ASSESSMENTS)[number])
    : null;
  return {
    reference: input.reference,
    version_number: input.versionNumber,
    current: input.current,
    published_at: input.publishedAt,
    first_published_at: input.firstPublishedAt,
    assessment: input.assessment,
    assessment_label: assessment ? CIVIC_ASSESSMENT_LABEL[assessment] : input.assessment,
    assessment_line: assessment ? CIVIC_ASSESSMENT_LINE[assessment] : "",
    rationale: input.rationale,
    change_reason: input.changeReason,
    claim_text: input.payload.claim_text,
    conclusion: input.payload.conclusion,
    evidence_summary: input.payload.evidence_summary,
    limitations: input.payload.limitations,
    methodology: input.payload.methodology,
    location_text: input.payload.location_text,
    conflict_note: input.payload.conflict_note,
    sources: input.payload.sources,
    technical: input.payload.technical,
    technical_note: input.payload.technical.length ? CIVIC_TECHNICAL_NOTE : null,
    versions: input.history,
  };
}
