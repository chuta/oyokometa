import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const ts = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  displayName: text("display_name"),
  status: text("status").notNull().default("active"),
  role: text("role").notNull().default("user"),
  googleId: text("google_id"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...ts,
});

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
    ...ts,
  },
  (t) => [uniqueIndex("payments_reference_code_idx").on(t.referenceCode)],
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
