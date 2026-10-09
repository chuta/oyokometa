# Oyokometa

Web service to **Analyze** an image’s digital history, **Create** a signed provenance record, and **Verify** whether a file matches a record. Build from [PRD v3.0](./Oyokometa%20—%20MVP%20Product%20Requirements%20Document%20v3.0.md) only.

R1 ships Analyze without a paywall. R2 adds accounts, credits, bank-transfer top-ups, reports and share links. R3 adds Create (platform-signed records) and Verify. AI pixel labels stay off until the §12 benchmark gate is recorded in `config.ai_labels_enabled`.

Bank details for credit packs: `BANK_NAME`, `BANK_ACCOUNT_NAME`, `BANK_ACCOUNT_NUMBER` in `.env`. The first magic-link address in `ADMIN_EMAIL` becomes an admin.

## Supabase

Project: [vpvhshoxwaorrwtaxvdb](https://vpvhshoxwaorrwtaxvdb.supabase.co).

1. In the dashboard, copy the database URI (Settings → Database) into `DATABASE_URL`.
2. Copy the anon/publishable key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Apply schema: `pnpm db:migrate` (uses SSL and disables prepared statements on the pooler).

The API talks to Postgres directly. Row Level Security is enabled so the public Data API cannot read app tables.

## Fly.io

API Machines in London (`lhr`): [https://oyokometa-api.fly.dev](https://oyokometa-api.fly.dev) (`GET /health`).

```bash
fly deploy --ha=false
```

Secrets (database URI, session keys, signing PEM) live in `fly secrets`, not `fly.toml`. After the Netlify site is live, set `WEB_ORIGIN` to that origin (comma-separated with the API URL if needed) and `NEXT_PUBLIC_API_URL=https://oyokometa-api.fly.dev` on the web app.

`oyokometa-worker` exists for a later Redis-backed split; the API currently runs the pipeline inline (`INLINE_WORKER=true`). Uploads persist on the `okm_data` volume.

## Local development

```bash
pnpm install
docker compose up -d postgres
cp .env.example .env
export $(grep -v '^#' .env | xargs)
pnpm db:migrate
INLINE_WORKER=true STORAGE_DRIVER=fs pnpm --filter @oyokometa/api dev
pnpm --filter @oyokometa/web dev
```

Open http://localhost:3000 — Analyze, Create a platform-signed record, or Verify a file (JPEG/PNG/WebP/HEIC/TIFF, 25 MB). Published keys: `/.well-known/oyokometa-keys.json`. Offline check: `docs/offline-verification.md`.

Optional: Redis + MinIO + ClamAV (`docker compose --profile full up`) and unset `INLINE_WORKER` so jobs go through BullMQ.

## Layout

- `apps/web` — Next.js (Netlify)
- `apps/api` — Hono `/api/v1`
- `apps/worker` — sandboxed pipeline
- `packages/evidence` — rules engine (EV-10 tests)
- `packages/config` — limits and copy
- `infra/` — Fly, Terraform skeletons

## Guardrails

No authenticity scores, no “owner/original/certified” copy, no public object URLs, no GPS without an explicit reveal, no AI labels before the gate.
