CREATE TABLE IF NOT EXISTS capture_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES users(id),
  reference_code text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  token_hash text NOT NULL UNIQUE,
  prompt text NOT NULL,
  address text,
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz NOT NULL,
  provenance_record_id uuid REFERENCES provenance_records(id),
  asset_id uuid REFERENCES assets(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS capture_requests_owner_idx ON capture_requests (owner_user_id, created_at);

CREATE TABLE IF NOT EXISTS capture_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES capture_requests(id),
  nonce_hash text NOT NULL,
  nonce_expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  user_agent text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS capture_sessions_request_idx ON capture_sessions (request_id, created_at);

CREATE TABLE IF NOT EXISTS capture_frames (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES capture_requests(id),
  session_id uuid NOT NULL REFERENCES capture_sessions(id),
  sha256 text NOT NULL,
  byte_size integer NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  camera_reported boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE capture_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE capture_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE capture_frames ENABLE ROW LEVEL SECURITY;

INSERT INTO action_prices (action, credits)
SELECT 'capture_request', 25
WHERE NOT EXISTS (SELECT 1 FROM action_prices WHERE action = 'capture_request');
