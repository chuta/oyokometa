CREATE TABLE IF NOT EXISTS client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'new',
  contact_name text NOT NULL,
  email text NOT NULL,
  organization_name text NOT NULL,
  job_title text NOT NULL,
  country text NOT NULL,
  contact_method text NOT NULL,
  phone text,
  website text,
  profile_url text,
  preferred_time text,
  organization_type text NOT NULL,
  organization_context text,
  services jsonb NOT NULL,
  needs jsonb NOT NULL,
  problem text NOT NULL,
  media_types jsonb NOT NULL,
  media_sources jsonb NOT NULL,
  volume text,
  engagement text,
  budget_range text,
  currency text,
  expected_start text,
  decision_status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  privacy_ack boolean NOT NULL,
  marketing_consent boolean NOT NULL DEFAULT false,
  contact_consent boolean NOT NULL DEFAULT false,
  internal_notes text,
  assigned_user_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_requests_status_idx ON client_requests (status, created_at);
CREATE INDEX IF NOT EXISTS client_requests_email_idx ON client_requests (email, created_at);

CREATE TABLE IF NOT EXISTS client_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES client_requests(id),
  actor text NOT NULL,
  kind text NOT NULL,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_request_events_request_idx ON client_request_events (request_id, created_at);

ALTER TABLE client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_request_events ENABLE ROW LEVEL SECURITY;
