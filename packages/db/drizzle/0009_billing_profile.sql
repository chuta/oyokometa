ALTER TABLE users ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_line1 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_line2 text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_state text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_postal_code text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS billing_country text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bachs_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_bachs_customer_id_idx ON users (bachs_customer_id);
