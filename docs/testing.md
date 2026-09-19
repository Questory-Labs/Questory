# Testing

Questory uses Vitest for unit/integration tests and Playwright for web e2e.

## Commands

```bash
# All packages with a test script
pnpm test

# Local CI: Vitest + package/app builds + Playwright, in parallel
pnpm check
pnpm check -- --skip-e2e          # faster (no Playwright)
pnpm check -- --dry-run           # print the job plan
pnpm check -- --fail-fast --concurrency 4

# Per package
pnpm --filter @questorylabs/shared test
pnpm --filter @questorylabs/ui test
pnpm --filter @questorylabs/api test
pnpm --filter @questorylabs/web test
pnpm --filter @questorylabs/web test:e2e
```

`pnpm check` generates the SQLite Prisma client and builds `@questorylabs/shared` first, then runs independent tests/builds together. `web:build` and `web:e2e` never overlap (they both write `.next`).

Music, watch, and in-process cron tests live under `apps/api` (same Nest app).

## Env for backend tests

Tests set safe defaults in `apps/*/test/setup.ts`:

- `APP_MODE=local`
- `SESSION_SECRET=test-session-secret-32chars!!`
- `DATABASE_PROVIDER=sqlite`
- `CRON_SECRET=cron-test-secret` (api)

Most Nest tests boot focused modules with mocked Prisma/services — no Redis required.

## Security posture covered

- HMAC session cookies (tamper / expiry / wrong secret)
- Steam OpenID verify + allowlist
- Cron Bearer / `x-cron-secret` (timing-safe)
- Watch session binding + OAuth state HMAC (IDOR)
- Music ingest: `Authorization: Token` only (no `?token=`)
- Webhooks require a per-user `watch_webhook` ApiKey outside `local` (header `x-watch-webhook-secret`)
- Global Steam catalog sync runs on the in-process scheduler (`catalog-sync`, default `0 4 * * *`; override with `CRON_CATALOG_SCHEDULE`) or via `POST /v1/internal/cron/catalog-sync`
- UI `MusicGate` / `WatchGate` / `ReadGate` on `/music/*`, `/watch/*`, `/read/*`; notification `href` allowlist

### Sole-user fallback (watch)

In `APP_MODE=local` or `selfhosted`, watch routes may attach to the single existing user when **no** session cookie is present and the client does **not** pass `userId`. Disabled in `selfhosted-full` / `production`.

## Playwright

`apps/web/playwright.config.ts` starts Next on port 3000. E2e tests mock API responses with `page.route`. Install browsers once:

```bash
pnpm --filter @questorylabs/web exec playwright install chromium
```
