ALTER TABLE credit_products ADD COLUMN IF NOT EXISTS usd_price_minor integer;
ALTER TABLE credit_products ADD COLUMN IF NOT EXISTS bachs_product_id text;

ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url text;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS charge_id text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_charge_id_idx ON payments (charge_id);
