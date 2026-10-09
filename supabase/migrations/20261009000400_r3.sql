ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE OR REPLACE FUNCTION oyokometa_forbid_mutate() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'append_only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS provenance_events_no_update ON provenance_events;
CREATE TRIGGER provenance_events_no_update
  BEFORE UPDATE OR DELETE ON provenance_events
  FOR EACH ROW EXECUTE FUNCTION oyokometa_forbid_mutate();

DROP TRIGGER IF EXISTS credit_ledger_no_update ON credit_ledger;
CREATE TRIGGER credit_ledger_no_update
  BEFORE UPDATE OR DELETE ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION oyokometa_forbid_mutate();
