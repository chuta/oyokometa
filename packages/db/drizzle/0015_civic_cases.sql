CREATE TABLE IF NOT EXISTS civic_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_reference text NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  case_type text NOT NULL CHECK (case_type IN ('viral_media', 'result_sheet', 'incident', 'other')),
  title text NOT NULL,
  claim_text text NOT NULL,
  claim_source_url text,
  claimed_event_at timestamptz,
  claimed_event_time_precision text NOT NULL DEFAULT 'unknown' CHECK (claimed_event_time_precision IN ('exact', 'date_only', 'approximate', 'unknown')),
  claimed_location_text text,
  location_precision text NOT NULL DEFAULT 'unknown' CHECK (location_precision IN ('broad', 'approximate', 'exact', 'unknown')),
  election_or_event text,
  state text,
  lga text,
  ward text,
  polling_unit_code text,
  contributor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  workflow_status text NOT NULL DEFAULT 'received' CHECK (workflow_status IN (
    'received', 'triage', 'under_review', 'awaiting_corroboration', 'awaiting_contributor',
    'proposed_finding', 'editor_review', 'published', 'referred', 'closed', 'reopened', 'withdrawn'
  )),
  claim_assessment text CHECK (claim_assessment IS NULL OR claim_assessment IN (
    'corroborated', 'contradicted', 'misleading_context', 'partly_supported',
    'inconclusive', 'unable_to_assess', 'withdrawn'
  )),
  assessment_rationale text,
  publication_state text NOT NULL DEFAULT 'private' CHECK (publication_state IN ('private', 'approved', 'published', 'unpublished')),
  sensitivity_level text NOT NULL DEFAULT 'standard' CHECK (sensitivity_level IN ('standard', 'sensitive', 'restricted')),
  identity_restricted boolean NOT NULL DEFAULT true,
  assigned_reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz,
  closed_at timestamptz,
  reopened_at timestamptz,
  current_public_version_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civic_cases_status_idx ON civic_cases (workflow_status, created_at);
CREATE INDEX IF NOT EXISTS civic_cases_contributor_idx ON civic_cases (contributor_id);
CREATE INDEX IF NOT EXISTS civic_cases_reviewer_idx ON civic_cases (assigned_reviewer_id);

CREATE TABLE IF NOT EXISTS civic_evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  evidence_type text NOT NULL,
  capture_record_id uuid REFERENCES provenance_records(id),
  asset_id uuid REFERENCES assets(id),
  source_url text,
  source_type text,
  file_name_display text,
  mime_type text,
  file_size integer,
  sha256 text,
  integrity_state text,
  technical_summary jsonb,
  declaration_json jsonb,
  access_classification text NOT NULL DEFAULT 'restricted',
  public_redaction_state text NOT NULL DEFAULT 'private',
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civic_evidence_case_idx ON civic_evidence_items (case_id, created_at);

CREATE TABLE IF NOT EXISTS civic_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  evidence_item_id uuid REFERENCES civic_evidence_items(id),
  url text,
  title text,
  publisher_or_origin text,
  source_type text NOT NULL,
  published_at timestamptz,
  accessed_at timestamptz,
  archived_reference text,
  independence_assessment text,
  reliability_notes text,
  added_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civic_sources_case_idx ON civic_sources (case_id);

CREATE TABLE IF NOT EXISTS civic_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  review_stage text NOT NULL,
  proposed_assessment text,
  rationale text NOT NULL,
  limitations text,
  alternative_explanations text,
  review_checklist_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz
);

CREATE INDEX IF NOT EXISTS civic_reviews_case_idx ON civic_reviews (case_id, created_at);

CREATE TABLE IF NOT EXISTS civic_evidence_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  evidence_item_id uuid NOT NULL REFERENCES civic_evidence_items(id),
  relationship text NOT NULL CHECK (relationship IN ('supports', 'contradicts', 'neutral', 'unknown')),
  statement text NOT NULL,
  basis text,
  reviewer_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS civic_evidence_assessments_case_idx ON civic_evidence_assessments (case_id);

CREATE TABLE IF NOT EXISTS civic_case_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  version_number integer NOT NULL,
  public_payload jsonb NOT NULL,
  assessment text NOT NULL,
  rationale text NOT NULL,
  published_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL,
  change_reason text NOT NULL,
  supersedes_version_id uuid,
  UNIQUE (case_id, version_number)
);

ALTER TABLE civic_cases
  DROP CONSTRAINT IF EXISTS civic_cases_current_public_version_fk;
ALTER TABLE civic_cases
  ADD CONSTRAINT civic_cases_current_public_version_fk
  FOREIGN KEY (current_public_version_id) REFERENCES civic_case_versions(id);

ALTER TABLE civic_case_versions
  DROP CONSTRAINT IF EXISTS civic_case_versions_supersedes_fk;
ALTER TABLE civic_case_versions
  ADD CONSTRAINT civic_case_versions_supersedes_fk
  FOREIGN KEY (supersedes_version_id) REFERENCES civic_case_versions(id);

CREATE TABLE IF NOT EXISTS civic_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  target_type text,
  target_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS civic_audit_events_case_idx ON civic_audit_events (case_id, occurred_at);

CREATE TABLE IF NOT EXISTS civic_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES civic_cases(id),
  public_version_id uuid REFERENCES civic_case_versions(id),
  submitted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  supporting_evidence_reference text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'withdrawn')),
  assigned_editor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS civic_appeals_case_idx ON civic_appeals (case_id, created_at);

ALTER TABLE capture_requests ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES civic_cases(id);
CREATE INDEX IF NOT EXISTS capture_requests_case_idx ON capture_requests (case_id);

ALTER TABLE civic_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_evidence_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_case_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE civic_appeals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION civic_audit_events_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'civic_audit_events is append-only (% blocked)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS civic_audit_events_append_only ON civic_audit_events;
CREATE TRIGGER civic_audit_events_append_only
  BEFORE UPDATE OR DELETE ON civic_audit_events
  FOR EACH ROW EXECUTE FUNCTION civic_audit_events_append_only();

DROP TRIGGER IF EXISTS civic_audit_events_no_truncate ON civic_audit_events;
CREATE TRIGGER civic_audit_events_no_truncate
  BEFORE TRUNCATE ON civic_audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION civic_audit_events_append_only();
