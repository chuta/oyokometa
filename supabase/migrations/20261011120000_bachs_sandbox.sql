ALTER TABLE credit_products ADD COLUMN IF NOT EXISTS bachs_sandbox_product_id text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bachs_sandbox_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS users_bachs_sandbox_customer_id_idx ON users (bachs_sandbox_customer_id);
