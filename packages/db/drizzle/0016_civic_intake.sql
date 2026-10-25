ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS incident_category text;
ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS observation_basis text;
ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS contributor_email text;
ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS contributor_session_id uuid REFERENCES anonymous_sessions(id) ON DELETE SET NULL;
ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS receipt_token_hash text;
ALTER TABLE civic_cases ADD COLUMN IF NOT EXISTS ip_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS civic_cases_receipt_token_idx ON civic_cases (receipt_token_hash);
CREATE UNIQUE INDEX IF NOT EXISTS civic_evidence_asset_uidx ON civic_evidence_items (asset_id) WHERE asset_id IS NOT NULL;

ALTER TABLE civic_cases DROP CONSTRAINT IF EXISTS civic_cases_incident_category_chk;
ALTER TABLE civic_cases ADD CONSTRAINT civic_cases_incident_category_chk
  CHECK (incident_category IS NULL OR incident_category IN (
    'intimidation', 'vote_buying', 'obstruction', 'violence', 'campaign_rule', 'access', 'other'
  ));

ALTER TABLE civic_cases DROP CONSTRAINT IF EXISTS civic_cases_observation_basis_chk;
ALTER TABLE civic_cases ADD CONSTRAINT civic_cases_observation_basis_chk
  CHECK (observation_basis IS NULL OR observation_basis IN ('witnessed', 'told', 'online'));
