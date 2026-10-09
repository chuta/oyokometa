CREATE TABLE IF NOT EXISTS schema_migrations (
  id text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  email_verified_at timestamptz,
  display_name text,
  status text NOT NULL DEFAULT 'active',
  role text NOT NULL DEFAULT 'user',
  google_id text,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anonymous_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  linked_user_id uuid REFERENCES users(id),
  scan_count integer NOT NULL DEFAULT 0,
  scan_count_date text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sha256 text,
  phash text,
  detected_mime text,
  original_filename text,
  byte_size bigint,
  width integer,
  height integer,
  storage_key text NOT NULL,
  preview_key text,
  owner_user_id uuid REFERENCES users(id),
  owner_session_id uuid REFERENCES anonymous_sessions(id),
  image_deleted_at timestamptz,
  retain_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS assets_sha256_idx ON assets (sha256);
CREATE INDEX IF NOT EXISTS assets_phash_idx ON assets (phash);

CREATE TABLE IF NOT EXISTS analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id),
  owner_user_id uuid REFERENCES users(id),
  owner_session_id uuid REFERENCES anonymous_sessions(id),
  tier text NOT NULL DEFAULT 'quick',
  status text NOT NULL DEFAULT 'queued',
  stage text NOT NULL DEFAULT 'reading',
  idempotency_key text NOT NULL,
  ruleset_version text NOT NULL,
  analyzer_versions jsonb DEFAULT '{}'::jsonb,
  trust_list_version text,
  credit_hold_id uuid,
  error_code text,
  error_message text,
  findings jsonb,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_owner_idem_idx ON analysis_jobs (idempotency_key, coalesce(owner_session_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(owner_user_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE TABLE IF NOT EXISTS evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id),
  category text NOT NULL,
  signal text NOT NULL,
  value text NOT NULL,
  source text NOT NULL,
  tier text NOT NULL,
  strength text NOT NULL,
  producer text NOT NULL,
  raw_ref text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS raw_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id),
  producer text NOT NULL,
  payload jsonb,
  storage_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS c2pa_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id),
  state text NOT NULL,
  signer text,
  claim_generator text,
  signed_at timestamptz,
  actions jsonb,
  ingredients jsonb,
  ai_assertion text,
  failure_reason text,
  trust_list_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id),
  category text NOT NULL,
  classification text NOT NULL,
  confidence text NOT NULL,
  rule_id text NOT NULL,
  evidence_ids jsonb NOT NULL,
  summary text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id),
  format text NOT NULL,
  report_hash text NOT NULL,
  storage_key text NOT NULL,
  superseded_by uuid,
  include_gps boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES analysis_jobs(id),
  public_id text NOT NULL UNIQUE,
  include_image boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  cached_balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS credit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES credit_wallets(id),
  type text NOT NULL,
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reference_type text,
  reference_id text,
  idempotency_key text NOT NULL UNIQUE,
  lot_expires_at timestamptz,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_wallet_idx ON credit_ledger (wallet_id);

-- Application role must not UPDATE or DELETE ledger or provenance events (PRD §13.3 R3).
REVOKE UPDATE, DELETE ON credit_ledger FROM PUBLIC;

CREATE TABLE IF NOT EXISTS credit_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  credits integer NOT NULL,
  currency text NOT NULL,
  price_minor integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS action_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  credits integer NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,
  provider_ref text,
  product_id uuid REFERENCES credit_products(id),
  amount_minor integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  payload jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_events_provider_event ON payment_events (provider, provider_event_id);

CREATE TABLE IF NOT EXISTS magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS provenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id text NOT NULL UNIQUE,
  asset_sha256 text NOT NULL,
  phash text,
  owner_user_id uuid NOT NULL REFERENCES users(id),
  mode text NOT NULL,
  visibility text NOT NULL DEFAULT 'private',
  status text NOT NULL DEFAULT 'active',
  declarations jsonb DEFAULT '{}'::jsonb,
  credential_type text NOT NULL DEFAULT 'platform_signed_record',
  signing_key_id text NOT NULL,
  signature text NOT NULL,
  tsa_token text,
  baseline_job_id uuid REFERENCES analysis_jobs(id),
  show_thumbnail boolean NOT NULL DEFAULT false,
  thumbnail_key text,
  mime_type text,
  dimensions text,
  byte_size integer,
  display_name text,
  canonical_json text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prov_sha_idx ON provenance_records (asset_sha256);
CREATE INDEX IF NOT EXISTS prov_phash_idx ON provenance_records (phash);

CREATE TABLE IF NOT EXISTS provenance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES provenance_records(id),
  type text NOT NULL,
  actor text NOT NULL,
  input_hash text NOT NULL,
  output_hash text NOT NULL,
  payload jsonb,
  signature text NOT NULL,
  prev_event_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE UPDATE, DELETE ON provenance_events FROM PUBLIC;

CREATE TABLE IF NOT EXISTS verification_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES provenance_records(id),
  submitted_sha256 text NOT NULL,
  match_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid REFERENCES provenance_records(id),
  share_link_id uuid REFERENCES share_links(id),
  complainant_email text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text NOT NULL,
  action text NOT NULL,
  target text,
  reason text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO config (key, value) VALUES
  ('ai_labels_enabled', 'false'::jsonb),
  ('ruleset_version', '"ruleset-1.0.0"'::jsonb),
  ('limits', '{"maxFileBytes":26214400,"maxMegapixels":100,"maxLongestSidePx":20000}'::jsonb),
  ('phash_hamming', '8'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO action_prices (action, credits) VALUES
  ('quick_scan', 0),
  ('deep_analysis', 10),
  ('report', 15),
  ('deep_plus_report', 25),
  ('provenance_registration', 25),
  ('verify', 0)
ON CONFLICT DO NOTHING;

INSERT INTO credit_products (name, credits, currency, price_minor, active) VALUES
  ('Starter', 100, 'NGN', 0, true),
  ('Standard', 500, 'NGN', 0, true),
  ('Professional', 2000, 'NGN', 0, true),
  ('Starter USD', 100, 'USD', 0, true),
  ('Standard USD', 500, 'USD', 0, true),
  ('Professional USD', 2000, 'USD', 0, true)
ON CONFLICT DO NOTHING;
