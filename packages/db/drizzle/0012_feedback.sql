CREATE TABLE IF NOT EXISTS feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS feedback_messages_email_idx ON feedback_messages (email, created_at);

ALTER TABLE feedback_messages ENABLE ROW LEVEL SECURITY;
