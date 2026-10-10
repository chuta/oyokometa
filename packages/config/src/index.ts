export const PRODUCT_NAME = "Oyokometa";
export const RULESET_VERSION = "ruleset-1.0.0";
export const PLATFORM_VERSION = "0.1.0";

export const LIMITS = {
  maxFileBytes: 25 * 1024 * 1024,
  maxMegapixels: 100,
  maxLongestSidePx: 20_000,
  decodeTimeoutMs: 30_000,
  signedUrlTtlSeconds: 5 * 60,
  anonymousImageRetentionHours: 24,
  signedInImageRetentionDays: 30,
  shareLinkDefaultDays: 90,
  anonymousScansPerSessionPerDay: 3,
  anonymousScansPerIpPerDay: 10,
  signedInFreeScansPerDay: 10,
  uploadChunkBytes: 5 * 1024 * 1024,
} as const;

export const PHASH = {
  bits: 64,
  hammingThreshold: 8,
} as const;

export const SESSION = {
  cookieName: "okm_session",
  ttlDays: 30,
  anonymousCookieName: "okm_anon",
} as const;

export const CREDIT_DEFAULTS = {
  quickScan: 0,
  deepAnalysis: 10,
  report: 15,
  deepPlusReport: 25,
  provenanceRegistration: 25,
  verify: 0,
  locationResolution: 10,
  signupBonus: 10,
} as const;

export const PACKS = [
  { name: "Starter", credits: 100 },
  { name: "Standard", credits: 500 },
  { name: "Professional", credits: 2_000 },
] as const;

export const STAGES = [
  "reading",
  "fingerprinting",
  "metadata",
  "credentials",
  "image_characteristics",
  "report",
] as const;

export type AnalysisStage = (typeof STAGES)[number];

export const ERROR_CODES = {
  unsupported_type: "unsupported_type",
  too_large: "too_large",
  corrupt: "corrupt",
  malware_flagged: "malware_flagged",
  timeout: "timeout",
  service_unavailable: "service_unavailable",
  not_found: "not_found",
  unauthorized: "unauthorized",
  rate_limited: "rate_limited",
  conflict: "conflict",
  validation_error: "validation_error",
  insufficient_credits: "insufficient_credits",
  email_unverified: "email_unverified",
  payment_required: "payment_required",
  price_changed: "price_changed",
} as const;

export const FORBIDDEN_COPY = [
  "authentic",
  "genuine",
  "owner",
  "original",
  "certified",
  "court-admissible",
  "forensically verified",
] as const;

export const TRUST_LINE =
  "We separate verified facts from technical signals and inference";

export const LIMITATIONS_BLOCK = [
  "This analysis does not establish when the photo was actually taken.",
  "This analysis does not establish who took it.",
  "This analysis does not establish whether metadata was altered.",
  "This analysis does not establish whether the depicted event occurred.",
  "Missing EXIF, missing Content Credentials, a screenshot, or an editor tag are not evidence of AI generation or deception.",
].join(" ");

export const WHAT_THIS_DOES_NOT_ESTABLISH =
  "What this does not establish: when the photo was actually taken, who took it, whether metadata was altered, or whether the depicted event occurred.";

export const ACQUISITION_STATEMENT =
  "This is a record of the file submitted to Oyokometa at the time shown. It is not proof that the submitter held the original camera file, and it is not a forensic or legal certification.";

export const LEGAL_DISCLAIMER =
  "Not a forensic certification, not legal advice, and not a determination of authenticity or authorship.";

export const VERIFY_HEADLINES = {
  exact: "This file matches the registered record",
  no_match: "This file does not match this record",
  similar: "Visually similar to a registered image",
  record_problem: "This record cannot be relied on",
} as const;

export const VERIFY_SUBLINES = {
  exact:
    "This confirms the file is unchanged since registration. It does not confirm who created it or what it shows.",
  no_match:
    "The file may be a resized, recompressed or edited copy, or a different image.",
  similar:
    "Similarity does not establish that one file derives from the other, or who owns either.",
} as const;

export const REGISTRATION_ATTESTATION =
  "I have the right to register this file. I understand this record does not prove authorship.";

export const RECORD_STATES =
  "A provenance record states one thing with cryptographic backing: this account registered these exact bytes no later than this time. Everything else on the record is a declaration.";

export const C2PA_NOT_DETECTED_LINE =
  "Most images have no Content Credentials. This says nothing about whether the image is genuine.";

export const PUBLIC_PAGE_STANDING_LINE =
  "This page reports technical analysis of a file. It makes no statement about any person shown or named.";

export const PROCESSED_BY_TEMPLATE = (software: string) =>
  `processed by ${software}; this does not establish what was changed`;

export const AI_SECTION_UNAVAILABLE = "AI analysis not yet available";
