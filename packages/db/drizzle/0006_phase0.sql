-- Single-use emailed tokens now serve password resets and account-deletion confirmation.
ALTER TABLE password_resets ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'password_reset';

-- audit_log is append-only. The one exception is account erasure, which may redact
-- target/reason/metadata inside a transaction that sets oyokometa.audit_redaction = 'on'.
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND current_setting('oyokometa.audit_redaction', true) = 'on'
     AND NEW.id = OLD.id
     AND NEW.actor = OLD.actor
     AND NEW.action = OLD.action
     AND NEW.created_at = OLD.created_at THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'audit_log is append-only (% blocked)', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END $$;

DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
CREATE TRIGGER audit_log_no_truncate
  BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();

REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE UPDATE, DELETE, TRUNCATE ON public.audit_log FROM %I', r);
    END IF;
  END LOOP;
END $$;
