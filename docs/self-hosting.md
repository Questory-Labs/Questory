# Self-hosting Questory Labs

## Modes

| `APP_MODE` | Stack | Best for |
|------------|--------|----------|
| `local` | SQLite, no Redis | Development on your machine |
| `selfhosted` | SQLite volume, inline sync | Home server / small household |
| `selfhosted-full` | Postgres + Redis + queues | Always-on self-host with more users |
| `production` | Same as full + public HTTPS checks | Cloud / multi-user |

**Caching:** the API always caches (in-memory by default). Set `REDIS_URL` to share cache and enrich locks across processes and enable BullMQ sync queues. Without Redis, game metadata freshness still applies via DB timestamps (`metadataSyncedAt` — skip Steam re-enrich for ~1 day), so concurrent syncs on a single process do not re-scan the same games.

Copy the matching template to `.env`, then set secrets:

```bash
cp .env.selfhosted.example .env          # or .env.selfhosted-full.example / .env.production.example
# edit SESSION_SECRET, STEAM_API_KEY, URLs, optional ALLOWED_STEAM_IDS
```

## Quick deploy

Compose pulls prebuilt images from Docker Hub when available (`santoshpanna/questorylabs-api`, `santoshpanna/questorylabs-web`, `santoshpanna/questorylabs-cron`). Pass `--build` to build from this repo instead.

**Lite (SQLite):**

```bash
pnpm docker:selfhosted
# or force a local build:
pnpm docker:selfhosted -- --build
```

**Full (Postgres + Redis):**

```bash
pnpm docker:selfhosted-full
```

**Production profile** (same services as full; set `APP_MODE=production` and public HTTPS URLs in `.env`):

```bash
pnpm docker:prod
```

Web: `http://localhost:3000` (or your `WEB_ORIGIN`)  
API: `http://localhost:4000` (or your public API URL)

`GET /health` reports `mode`, database provider, Redis/sync mode, and whether the Steam allowlist is enabled (not the IDs).

### Docker Hub images

| Image | Service |
|-------|---------|
| `santoshpanna/questorylabs-api` | `api` / `api-lite` (SQLite or Postgres chosen at runtime) |
| `santoshpanna/questorylabs-web` | `web` |
| `santoshpanna/questorylabs-cron` | `cron` |

Optional `.env` overrides:

```env
DOCKERHUB_NAMESPACE=santoshpanna
IMAGE_TAG=latest
# PULL_POLICY=always   # always re-pull on up
```

Publish (maintainers — requires `docker login`):

```bash
pnpm docker:publish                 # build + push :latest
IMAGE_TAG=0.1.0 pnpm docker:publish # also tags :latest
pnpm docker:build                   # build only, no push
```

### GitHub release tags

Two workflows (see `.github/workflows/`):

| Tag | Workflow | What it does |
|-----|----------|--------------|
| `docker-api-1.0.0` (or `web` / `cron`) | Docker Release | Run service tests (if any) → build/push Hub image → GH release |
| `service-api-1.0.0` (or `web` / `cron`) | Service Release | Pull existing image → GH release → optional remote deploy |

```bash
# 1) Publish image
git tag docker-api-1.0.0 && git push origin docker-api-1.0.0

# 2) Release/deploy that image (same semver)
git tag service-api-1.0.0 && git push origin service-api-1.0.0
```

**Secrets:** `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`  
**Optional remote deploy:** set repo variable `ENABLE_SERVICE_DEPLOY=true`, secrets `DEPLOY_HOST` / `DEPLOY_USER` / `DEPLOY_SSH_KEY`, and variable `DEPLOY_PATH`.

Pushes/PRs to `main` run CI tests per service when a `test` script exists; otherwise that service is skipped.

`NEXT_PUBLIC_API_URL` is baked into the **web** image at build time. The published `:latest` defaults to `http://localhost:4000`. For a custom public API URL, rebuild web locally:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com pnpm docker:selfhosted-full -- --build
```

## Steam OpenID URLs

- `STEAM_REALM` and `STEAM_RETURN_URL` must use the **API** origin.
- `STEAM_REALM` must be a prefix of `STEAM_RETURN_URL`.
- Example: realm `https://api.example.com`, return `https://api.example.com/auth/steam/callback`.
- `WEB_ORIGIN` is the browser app origin (CORS + post-login redirect).
- `NEXT_PUBLIC_API_URL` is baked into the web image at **build** time — rebuild web after changing it.

## Steam ID allowlist

Set `ALLOWED_STEAM_IDS` to a comma-separated list of 17-digit SteamIDs (find yours via [steamid.io](https://steamid.io) or similar):

```env
ALLOWED_STEAM_IDS=76561198000000000,76561198000000001
```

- Non-empty: only listed accounts can complete login (others get `?error=not_allowed`).
- Empty / unset: anyone who can reach the instance may sign in with Steam.

Recommended for private `selfhosted` / `selfhosted-full` deployments.

## Reverse proxy tip

Prefer a **same-origin** setup (e.g. `https://games.example.com` for the UI and `https://games.example.com/api` proxied to the API). That avoids cross-site cookie issues. If you use separate hosts (`app.` + `api.`), set HTTPS everywhere, `COOKIE_DOMAIN=.example.com`, and matching CORS `WEB_ORIGIN`.

Example Caddy sketch (same host, path split):

```caddy
games.example.com {
  handle /auth/* {
    reverse_proxy api:4000
  }
  handle /health {
    reverse_proxy api:4000
  }
  handle /api/* {
    uri strip_prefix /api
    reverse_proxy api:4000
  }
  handle {
    reverse_proxy web:3000
  }
}
```

Adjust paths to match how you expose the Nest routes (this repo serves API routes at the root of the API service, not under `/api` unless you add a prefix).

## Backups

**Lite (SQLite):** copy the Docker volume file (default DB path inside the container: `/data/questorylabs.db`), or back up the `sqlite_data` volume.

**Full / production (Postgres):** use `pg_dump` against the `postgres` service, or snapshot the `postgres_data` volume. Redis holds cache, locks, and in-flight jobs — back it up only if you care about queue state (library data lives in Postgres).

## Daily sync cron

Full / production Compose profiles include an optional `cron` service. It does **not** talk to Steam directly — it calls API endpoints:

- `POST /internal/cron/daily-refresh` — enqueue `library-sync` + `metadata-refresh` for every logged-in user
- `POST /internal/cron/recover-failed-sync` — clear stuck `SyncJob` rows and catalog lock/failed state

Enable it in `.env`:

```env
CRON_ENABLED=true
CRON_SECRET=a-long-random-shared-secret
API_INTERNAL_URL=http://api:4000
```

`CRON_SECRET` must be set on both the API and cron containers. When `CRON_ENABLED` is not `true`/`TRUE`/`1`, the cron process exits immediately (Compose uses `restart: on-failure` so it will not loop).

Locally (API already running):

```bash
# in .env: CRON_ENABLED=true and CRON_SECRET=...
pnpm dev:cron
```

## Secrets checklist

- `SESSION_SECRET` — long random string (API rejects weak placeholders in non-local modes)
- `STEAM_API_KEY` — [Steam Web API key](https://steamcommunity.com/dev/apikey)
- `CRON_SECRET` — required when using the cron service (`CRON_ENABLED=true`)
- Change default Postgres password in compose for any internet-facing host
- Never commit `.env`

## Schema deploy note

Containers run `prisma db push` on start. That is fine for self-host and early production; a future release may switch to versioned `prisma migrate deploy`.
