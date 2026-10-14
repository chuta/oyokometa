import {
  SOLUTION_ID_SETS,
  type SolutionServiceId,
} from "@oyokometa/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/;

export type SolutionIntake = {
  idempotencyKey: string;
  contactName: string;
  email: string;
  organizationName: string;
  jobTitle: string;
  country: string;
  contactMethod: string;
  phone: string | null;
  website: string | null;
  profileUrl: string | null;
  preferredTime: string | null;
  organizationType: string;
  organizationContext: string | null;
  services: SolutionServiceId[];
  needs: string[];
  problem: string;
  mediaTypes: string[];
  mediaSources: string[];
  volume: string | null;
  engagement: string | null;
  budgetRange: string | null;
  currency: string | null;
  expectedStart: string | null;
  decisionStatus: string | null;
  details: Record<string, string>;
  privacyAck: true;
  marketingConsent: boolean;
  contactConsent: boolean;
};

export type IntakeResult = { ok: true; value: SolutionIntake } | { ok: false; message: string };

function text(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function optional(value: unknown, max: number) {
  const out = text(value, max);
  return out || null;
}

function pickMany(value: unknown, allowed: Set<string>, max = 20) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string" || !allowed.has(item) || seen.has(item)) continue;
    seen.add(item);
    if (seen.size >= max) break;
  }
  return [...seen];
}

function pickOne(value: unknown, allowed: Set<string>) {
  const id = text(value, 80);
  return id && allowed.has(id) ? id : null;
}

const DETAIL_KEYS = [
  "trigger",
  "if_unaddressed",
  "handled_today",
  "current_tools",
  "success",
  "systems",
  "output_format",
  "turnaround",
  "security",
  "screening",
  "human_review",
  "tradeoff",
  "originals",
  "versions",
  "deliverable",
  "time_sensitive",
  "evidence_handling",
  "claim_type",
  "review_process",
  "case_system",
  "objective",
  "docs_available",
  "stack",
  "integration_audience",
  "throughput",
  "auth_notes",
  "test_env",
  "desired_outcome",
  "training_audience",
  "participants",
  "delivery_format",
  "advisory_mode",
] as const;

export function parseSolutionIntake(body: unknown): IntakeResult {
  if (!body || typeof body !== "object") return { ok: false, message: "Enter the request details." };
  const raw = body as Record<string, unknown>;
  if (text(raw.website_confirm, 200)) return { ok: false, message: "The request could not be accepted." };

  const idempotencyKey = text(raw.idempotency_key, 80);
  if (!KEY_RE.test(idempotencyKey)) return { ok: false, message: "Refresh the page and submit the request again." };

  const contactName = text(raw.contact_name, 120);
  const email = text(raw.email, 200).toLowerCase();
  const organizationName = text(raw.organization_name, 200);
  const jobTitle = text(raw.job_title, 120);
  const country = text(raw.country, 80);
  const contactMethod = pickOne(raw.contact_method, SOLUTION_ID_SETS.contactMethods);
  const phone = optional(raw.phone, 40);
  if (!contactName || !organizationName || !jobTitle || !country) {
    return { ok: false, message: "Enter your name, organisation, role, and country." };
  }
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Enter a valid email." };
  if (!contactMethod) return { ok: false, message: "Choose how you prefer to be contacted." };
  if (contactMethod === "phone" && !phone) return { ok: false, message: "Enter a phone number, or choose email instead." };

  const organizationType = pickOne(raw.organization_type, SOLUTION_ID_SETS.organizations);
  if (!organizationType) return { ok: false, message: "Choose an organisation type." };

  const services = pickMany(raw.services, SOLUTION_ID_SETS.services) as SolutionServiceId[];
  if (!services.length) return { ok: false, message: "Select at least one service." };
  const needs = pickMany(raw.needs, SOLUTION_ID_SETS.needs);

  const problem = text(raw.problem, 8000);
  if (problem.length < 40) {
    return { ok: false, message: "Describe the problem in at least a few sentences." };
  }

  if (raw.privacy_ack !== true) return { ok: false, message: "Confirm that you have read the privacy notice." };

  const details: Record<string, string> = {};
  const extra = raw.details;
  if (extra && typeof extra === "object" && !Array.isArray(extra)) {
    const bag = extra as Record<string, unknown>;
    for (const key of DETAIL_KEYS) {
      const value = text(bag[key], 2000);
      if (value) details[key] = value;
    }
  }

  return {
    ok: true,
    value: {
      idempotencyKey,
      contactName,
      email,
      organizationName,
      jobTitle,
      country,
      contactMethod,
      phone,
      website: optional(raw.website, 300),
      profileUrl: optional(raw.profile_url, 300),
      preferredTime: optional(raw.preferred_time, 120),
      organizationType,
      organizationContext: optional(raw.organization_context, 2000),
      services,
      needs,
      problem,
      mediaTypes: pickMany(raw.media_types, SOLUTION_ID_SETS.mediaTypes),
      mediaSources: pickMany(raw.media_sources, SOLUTION_ID_SETS.mediaSources),
      volume: pickOne(raw.volume, SOLUTION_ID_SETS.volumes),
      engagement: pickOne(raw.engagement, SOLUTION_ID_SETS.engagements),
      budgetRange: pickOne(raw.budget_range, SOLUTION_ID_SETS.budgets),
      currency: pickOne(raw.currency, SOLUTION_ID_SETS.currencies),
      expectedStart: pickOne(raw.expected_start, SOLUTION_ID_SETS.starts),
      decisionStatus: pickOne(raw.decision_status, SOLUTION_ID_SETS.decisions),
      details,
      privacyAck: true,
      marketingConsent: raw.marketing_consent === true,
      contactConsent: raw.contact_consent === true,
    },
  };
}
