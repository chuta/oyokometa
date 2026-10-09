-- Data API (anon/authenticated) must not read app tables. The Hono API uses DATABASE_URL (table owner / postgres) and bypasses RLS.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users',
    'anonymous_sessions',
    'sessions',
    'assets',
    'analysis_jobs',
    'evidence_items',
    'raw_outputs',
    'c2pa_results',
    'findings',
    'reports',
    'share_links',
    'credit_wallets',
    'credit_ledger',
    'credit_products',
    'action_prices',
    'payments',
    'payment_events',
    'magic_links',
    'provenance_records',
    'provenance_events',
    'verification_checks',
    'disputes',
    'audit_log',
    'config',
    'schema_migrations'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;
END $$;
