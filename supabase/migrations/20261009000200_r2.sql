ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS reference_code text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS credits_granted integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS payments_reference_code_idx ON payments (reference_code);

UPDATE credit_products SET price_minor = 500000, currency = 'NGN' WHERE name = 'Starter' AND currency = 'NGN';
UPDATE credit_products SET price_minor = 2000000, currency = 'NGN' WHERE name = 'Standard' AND currency = 'NGN';
UPDATE credit_products SET price_minor = 7000000, currency = 'NGN' WHERE name = 'Professional' AND currency = 'NGN';
DELETE FROM credit_products WHERE currency = 'USD';

INSERT INTO config (key, value) VALUES
  ('bank_transfer', '{"bank_name":"","account_name":"","account_number":"","currency":"NGN"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
