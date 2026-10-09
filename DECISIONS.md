# Decision notes

Substitutions and defaults from PRD v3.0 §10 / §14. Recorded as required by §13.2.

| Concern | PRD default | Choice | Note |
| --- | --- | --- | --- |
| Web | Next.js + Tailwind | Next.js 15 App Router, Tailwind 3 | SSR public pages |
| API | Node REST + OpenAPI | Hono on Node | Same contract |
| Queue | Redis-backed | BullMQ | Stage retry + DLQ |
| Storage | S3-compatible | AWS SDK + MinIO locally / R2 or S3 in prod | |
| Metadata | ExifTool | ExifTool when present; `exifr` fallback in local/dev | Producer version recorded |
| C2PA | Official SDK | `@contentauth/c2pa-node` `Reader` against C2PA 2.3; Trust List via `verifyTrust`; five AN-25 states from `validation_status`. Create still does not embed C2PA (PR-7) until a Trust List CA certificate. API/worker Node 22 for the native module. | Never a custom parser |
| Signing | Cloud KMS | `KmsSigner` interface; local ECDSA P-256 PEM in development | Production uses AWS KMS |
| TSA | RFC 3161 | Adapter; records unsigned timestamp assertion if TSA unset in local | Production requires TSA |
| Payments | Paystack/Flutterwave + Stripe | Direct bank transfer with unique `OKM-` narration code; user taps **I have paid** | Amount and pack still taken from `credit_products`. Credits granted once per payment id, never from a client-sent balance. Admin can reverse if the deposit is missing. |
| Malware | Scan then decode | ClamAV adapter; local `allow` scanner if daemon absent, flagged in audit | |
| Database | PostgreSQL | Supabase Postgres (`vpvhshoxwaorrwtaxvdb`) | App still uses Drizzle over `DATABASE_URL`. Data API locked with RLS; Hono uses the database URI. |
| AI labels | Off until §12 gate | `config.ai_labels_enabled` default false | AN-32 |
