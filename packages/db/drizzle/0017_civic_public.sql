ALTER TABLE civic_case_versions ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS civic_case_versions_idempotency_idx ON civic_case_versions (idempotency_key);

ALTER TABLE civic_appeals ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS civic_appeals_idempotency_idx ON civic_appeals (idempotency_key);
