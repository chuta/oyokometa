import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const ts = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    username: text("username").unique(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    displayName: text("display_name"),
    phone: text("phone"),
    billingLine1: text("billing_line1"),
    billingLine2: text("billing_line2"),
    billingCity: text("billing_city"),
    billingState: text("billing_state"),
    billingPostalCode: text("billing_postal_code"),
    billingCountry: text("billing_country"),
    bachsCustomerId: text("bachs_customer_id"),
    bachsSandboxCustomerId: text("bachs_sandbox_customer_id"),
    status: text("status").notNull().default("active"),
    role: text("role").notNull().default("user"),
    googleId: text("google_id"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...ts,
  },
  (t) => [
    uniqueIndex("users_bachs_customer_id_idx").on(t.bachsCustomerId),
    uniqueIndex("users_bachs_sandbox_customer_id_idx").on(t.bachsSandboxCustomerId),
  ],
);

export const anonymousSessions = pgTable("anonymous_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  linkedUserId: uuid("linked_user_id").references(() => users.id),
  scanCount: integer("scan_count").notNull().default(0),
  scanCountDate: text("scan_count_date"),
  ipHash: text("ip_hash"),
  ...ts,
});

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...ts,
});

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sha256: text("sha256"),
    phash: text("phash"),
    detectedMime: text("detected_mime"),
    declaredFilename: text("original_filename"),
    byteSize: bigint("byte_size", { mode: "number" }),
    width: integer("width"),
    height: integer("height"),
    storageKey: text("storage_key").notNull(),
    previewKey: text("preview_key"),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    ownerSessionId: uuid("owner_session_id").references(() => anonymousSessions.id),
    imageDeletedAt: timestamp("image_deleted_at", { withTimezone: true }),
    retainUntil: timestamp("retain_until", { withTimezone: true }),
    ...ts,
  },
  (t) => [
    index("assets_sha256_idx").on(t.sha256),
    index("assets_phash_idx").on(t.phash),
  ],
);

export const analysisJobs = pgTable(
  "analysis_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => assets.id),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    ownerSessionId: uuid("owner_session_id").references(() => anonymousSessions.id),
    tier: text("tier").notNull().default("quick"),
    status: text("status").notNull().default("queued"),
    stage: text("stage").notNull().default("reading"),
    idempotencyKey: text("idempotency_key").notNull(),
    rulesetVersion: text("ruleset_version").notNull(),
    analyzerVersions: jsonb("analyzer_versions").$type<Record<string, string>>().default({}),
    trustListVersion: text("trust_list_version"),
    creditHoldId: uuid("credit_hold_id"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    findings: jsonb("findings"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    ...ts,
  },
  (t) => [uniqueIndex("jobs_owner_idem_idx").on(t.idempotencyKey, t.ownerSessionId, t.ownerUserId)],
);

export const evidenceItems = pgTable("evidence_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => analysisJobs.id),
  category: text("category").notNull(),
  signal: text("signal").notNull(),
  value: text("value").notNull(),
  source: text("source").notNull(),
  tier: text("tier").notNull(),
  strength: text("strength").notNull(),
  producer: text("producer").notNull(),
  rawRef: text("raw_ref").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rawOutputs = pgTable("raw_outputs", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => analysisJobs.id),
  producer: text("producer").notNull(),
  payload: jsonb("payload"),
  storageKey: text("storage_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const c2paResults = pgTable("c2pa_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => analysisJobs.id),
  state: text("state").notNull(),
  signer: text("signer"),
  claimGenerator: text("claim_generator"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  actions: jsonb("actions"),
  ingredients: jsonb("ingredients"),
  aiAssertion: text("ai_assertion"),
  failureReason: text("failure_reason"),
  trustListVersion: text("trust_list_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const findings = pgTable("findings", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => analysisJobs.id),
  category: text("category").notNull(),
  classification: text("classification").notNull(),
  confidence: text("confidence").notNull(),
  ruleId: text("rule_id").notNull(),
  evidenceIds: jsonb("evidence_ids").$type<string[]>().notNull(),
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => analysisJobs.id),
  format: text("format").notNull(),
  reportHash: text("report_hash").notNull(),
  storageKey: text("storage_key").notNull(),
  supersededBy: uuid("superseded_by"),
  includeGps: boolean("include_gps").notNull().default(false),
  ...ts,
});

export const shareLinks = pgTable("share_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => analysisJobs.id),
  publicId: text("public_id").notNull().unique(),
  includeImage: boolean("include_image").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  ...ts,
});

export const creditWallets = pgTable("credit_wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  cachedBalance: integer("cached_balance").notNull().default(0),
  ...ts,
});

export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => creditWallets.id),
    type: text("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    referenceType: text("reference_type"),
    referenceId: text("reference_id"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    lotExpiresAt: timestamp("lot_expires_at", { withTimezone: true }),
    actor: text("actor"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ledger_wallet_idx").on(t.walletId)],
);

export const creditProducts = pgTable("credit_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  currency: text("currency").notNull(),
  priceMinor: integer("price_minor").notNull(),
  usdPriceMinor: integer("usd_price_minor"),
  bachsProductId: text("bachs_product_id"),
  bachsSandboxProductId: text("bachs_sandbox_product_id"),
  active: boolean("active").notNull().default(true),
  ...ts,
});

export const actionPrices = pgTable("action_prices", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: text("action").notNull(),
  credits: integer("credits").notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    productId: uuid("product_id").references(() => creditProducts.id),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("created"),
    referenceCode: text("reference_code"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    creditsGranted: integer("credits_granted").notNull().default(0),
    checkoutUrl: text("checkout_url"),
    chargeId: text("charge_id"),
    ...ts,
  },
  (t) => [
    uniqueIndex("payments_reference_code_idx").on(t.referenceCode),
    uniqueIndex("payments_charge_id_idx").on(t.chargeId),
  ],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: text("provider").notNull(),
    providerEventId: text("provider_event_id").notNull(),
    payload: jsonb("payload"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_events_provider_event").on(t.provider, t.providerEventId)],
);

export const magicLinks = pgTable("magic_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  purpose: text("purpose").notNull().default("password_reset"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const provenanceRecords = pgTable(
  "provenance_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull().unique(),
    assetSha256: text("asset_sha256").notNull(),
    phash: text("phash"),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    mode: text("mode").notNull(),
    visibility: text("visibility").notNull().default("private"),
    status: text("status").notNull().default("active"),
    declarations: jsonb("declarations").$type<Record<string, unknown>>().default({}),
    credentialType: text("credential_type").notNull().default("platform_signed_record"),
    signingKeyId: text("signing_key_id").notNull(),
    signature: text("signature").notNull(),
    tsaToken: text("tsa_token"),
    baselineJobId: uuid("baseline_job_id").references(() => analysisJobs.id),
    showThumbnail: boolean("show_thumbnail").notNull().default(false),
    thumbnailKey: text("thumbnail_key"),
    mimeType: text("mime_type"),
    dimensions: text("dimensions"),
    byteSize: integer("byte_size"),
    displayName: text("display_name"),
    canonicalJson: text("canonical_json").notNull(),
    ...ts,
  },
  (t) => [
    index("prov_sha_idx").on(t.assetSha256),
    index("prov_phash_idx").on(t.phash),
  ],
);

export const civicCases = pgTable(
  "civic_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicReference: text("public_reference").notNull().unique(),
    idempotencyKey: text("idempotency_key").unique(),
    caseType: text("case_type").notNull(),
    title: text("title").notNull(),
    claimText: text("claim_text").notNull(),
    claimSourceUrl: text("claim_source_url"),
    claimedEventAt: timestamp("claimed_event_at", { withTimezone: true }),
    claimedEventTimePrecision: text("claimed_event_time_precision").notNull().default("unknown"),
    claimedLocationText: text("claimed_location_text"),
    locationPrecision: text("location_precision").notNull().default("unknown"),
    electionOrEvent: text("election_or_event"),
    state: text("state"),
    lga: text("lga"),
    ward: text("ward"),
    pollingUnitCode: text("polling_unit_code"),
    contributorId: uuid("contributor_id").references(() => users.id, { onDelete: "set null" }),
    workflowStatus: text("workflow_status").notNull().default("received"),
    claimAssessment: text("claim_assessment"),
    assessmentRationale: text("assessment_rationale"),
    publicationState: text("publication_state").notNull().default("private"),
    sensitivityLevel: text("sensitivity_level").notNull().default("standard"),
    identityRestricted: boolean("identity_restricted").notNull().default(true),
    incidentCategory: text("incident_category"),
    observationBasis: text("observation_basis"),
    contributorEmail: text("contributor_email"),
    contributorSessionId: uuid("contributor_session_id").references(() => anonymousSessions.id, { onDelete: "set null" }),
    receiptTokenHash: text("receipt_token_hash").unique(),
    ipHash: text("ip_hash"),
    assignedReviewerId: uuid("assigned_reviewer_id").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),
    currentPublicVersionId: uuid("current_public_version_id"),
    ...ts,
  },
  (t) => [
    index("civic_cases_status_idx").on(t.workflowStatus, t.createdAt),
    index("civic_cases_contributor_idx").on(t.contributorId),
    index("civic_cases_reviewer_idx").on(t.assignedReviewerId),
  ],
);

export const civicEvidenceItems = pgTable(
  "civic_evidence_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    evidenceType: text("evidence_type").notNull(),
    captureRecordId: uuid("capture_record_id").references(() => provenanceRecords.id),
    assetId: uuid("asset_id").references(() => assets.id),
    sourceUrl: text("source_url"),
    sourceType: text("source_type"),
    fileNameDisplay: text("file_name_display"),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    sha256: text("sha256"),
    integrityState: text("integrity_state"),
    technicalSummary: jsonb("technical_summary").$type<Record<string, unknown>>(),
    declarationJson: jsonb("declaration_json").$type<Record<string, unknown>>(),
    accessClassification: text("access_classification").notNull().default("restricted"),
    publicRedactionState: text("public_redaction_state").notNull().default("private"),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    ...ts,
  },
  (t) => [index("civic_evidence_case_idx").on(t.caseId, t.createdAt)],
);

export const civicSources = pgTable(
  "civic_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    evidenceItemId: uuid("evidence_item_id").references(() => civicEvidenceItems.id),
    url: text("url"),
    title: text("title"),
    publisherOrOrigin: text("publisher_or_origin"),
    sourceType: text("source_type").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    accessedAt: timestamp("accessed_at", { withTimezone: true }),
    archivedReference: text("archived_reference"),
    independenceAssessment: text("independence_assessment"),
    reliabilityNotes: text("reliability_notes"),
    addedBy: uuid("added_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("civic_sources_case_idx").on(t.caseId)],
);

export const civicReviews = pgTable(
  "civic_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    reviewStage: text("review_stage").notNull(),
    proposedAssessment: text("proposed_assessment"),
    rationale: text("rationale").notNull(),
    limitations: text("limitations"),
    alternativeExplanations: text("alternative_explanations"),
    reviewChecklistJson: jsonb("review_checklist_json").$type<Record<string, unknown>>(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    ...ts,
  },
  (t) => [index("civic_reviews_case_idx").on(t.caseId, t.createdAt)],
);

export const civicEvidenceAssessments = pgTable(
  "civic_evidence_assessments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    evidenceItemId: uuid("evidence_item_id")
      .notNull()
      .references(() => civicEvidenceItems.id),
    relationship: text("relationship").notNull(),
    statement: text("statement").notNull(),
    basis: text("basis"),
    reviewerId: uuid("reviewer_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("civic_evidence_assessments_case_idx").on(t.caseId)],
);

export const civicCaseVersions = pgTable(
  "civic_case_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    versionNumber: integer("version_number").notNull(),
    publicPayload: jsonb("public_payload").$type<Record<string, unknown>>().notNull(),
    assessment: text("assessment").notNull(),
    rationale: text("rationale").notNull(),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
    changeReason: text("change_reason").notNull(),
    supersedesVersionId: uuid("supersedes_version_id"),
    idempotencyKey: text("idempotency_key").unique(),
  },
  (t) => [uniqueIndex("civic_case_versions_number_idx").on(t.caseId, t.versionNumber)],
);

export const civicAuditEvents = pgTable(
  "civic_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    targetType: text("target_type"),
    targetId: uuid("target_id"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  },
  (t) => [index("civic_audit_events_case_idx").on(t.caseId, t.occurredAt)],
);

export const civicAppeals = pgTable(
  "civic_appeals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => civicCases.id),
    publicVersionId: uuid("public_version_id").references(() => civicCaseVersions.id),
    submittedBy: uuid("submitted_by").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason").notNull(),
    supportingEvidenceReference: text("supporting_evidence_reference"),
    status: text("status").notNull().default("open"),
    assignedEditorId: uuid("assigned_editor_id").references(() => users.id, { onDelete: "set null" }),
    resolution: text("resolution"),
    idempotencyKey: text("idempotency_key").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (t) => [index("civic_appeals_case_idx").on(t.caseId, t.createdAt)],
);

export const provenanceEvents = pgTable("provenance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id")
    .notNull()
    .references(() => provenanceRecords.id),
  type: text("type").notNull(),
  actor: text("actor").notNull(),
  inputHash: text("input_hash").notNull(),
  outputHash: text("output_hash").notNull(),
  payload: jsonb("payload"),
  signature: text("signature").notNull(),
  prevEventHash: text("prev_event_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const captureRequests = pgTable(
  "capture_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id),
    referenceCode: text("reference_code").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    tokenHash: text("token_hash").notNull().unique(),
    prompt: text("prompt").notNull(),
    address: text("address"),
    status: text("status").notNull().default("open"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    provenanceRecordId: uuid("provenance_record_id").references(() => provenanceRecords.id),
    assetId: uuid("asset_id").references(() => assets.id),
    caseId: uuid("case_id").references(() => civicCases.id),
    ...ts,
  },
  (t) => [
    index("capture_requests_owner_idx").on(t.ownerUserId, t.createdAt),
    index("capture_requests_case_idx").on(t.caseId),
  ],
);

export const captureSessions = pgTable(
  "capture_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id")
      .notNull()
      .references(() => captureRequests.id),
    nonceHash: text("nonce_hash").notNull(),
    nonceExpiresAt: timestamp("nonce_expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    userAgent: text("user_agent"),
    ipHash: text("ip_hash"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("capture_sessions_request_idx").on(t.requestId, t.createdAt)],
);

export const captureFrames = pgTable("capture_frames", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => captureRequests.id),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => captureSessions.id),
  sha256: text("sha256").notNull(),
  byteSize: integer("byte_size").notNull(),
  mimeType: text("mime_type").notNull(),
  width: integer("width"),
  height: integer("height"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  accuracyM: doublePrecision("accuracy_m"),
  cameraReported: boolean("camera_reported").notNull().default(false),
  deviceReport: jsonb("device_report").$type<{
    camera_label: string | null;
    facing_mode: "user" | "environment" | null;
    platform: string | null;
    platform_version: string | null;
    model: string | null;
    mobile: boolean | null;
  } | null>(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationChecks = pgTable("verification_checks", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id").references(() => provenanceRecords.id),
  submittedSha256: text("submitted_sha256").notNull(),
  matchType: text("match_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: uuid("id").primaryKey().defaultRandom(),
  recordId: uuid("record_id").references(() => provenanceRecords.id),
  shareLinkId: uuid("share_link_id").references(() => shareLinks.id),
  complainantEmail: text("complainant_email").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  tokenHash: text("token_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  ...ts,
});

export const clientRequests = pgTable(
  "client_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceCode: text("reference_code").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").notNull().default("new"),
    contactName: text("contact_name").notNull(),
    email: text("email").notNull(),
    organizationName: text("organization_name").notNull(),
    jobTitle: text("job_title").notNull(),
    country: text("country").notNull(),
    contactMethod: text("contact_method").notNull(),
    phone: text("phone"),
    website: text("website"),
    profileUrl: text("profile_url"),
    preferredTime: text("preferred_time"),
    organizationType: text("organization_type").notNull(),
    organizationContext: text("organization_context"),
    services: jsonb("services").$type<string[]>().notNull(),
    needs: jsonb("needs").$type<string[]>().notNull(),
    problem: text("problem").notNull(),
    mediaTypes: jsonb("media_types").$type<string[]>().notNull(),
    mediaSources: jsonb("media_sources").$type<string[]>().notNull(),
    volume: text("volume"),
    engagement: text("engagement"),
    budgetRange: text("budget_range"),
    currency: text("currency"),
    expectedStart: text("expected_start"),
    decisionStatus: text("decision_status"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull(),
    privacyAck: boolean("privacy_ack").notNull(),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    contactConsent: boolean("contact_consent").notNull().default(false),
    internalNotes: text("internal_notes"),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    ...ts,
  },
  (t) => [index("client_requests_status_idx").on(t.status, t.createdAt)],
);

export const clientRequestEvents = pgTable("client_request_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id")
    .notNull()
    .references(() => clientRequests.id),
  actor: text("actor").notNull(),
  kind: text("kind").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const feedbackMessages = pgTable(
  "feedback_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    referenceCode: text("reference_code").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_messages_email_idx").on(t.email, t.createdAt)],
);

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actor: text("actor").notNull(),
  action: text("action").notNull(),
  target: text("target"),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const config = pgTable("config", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
