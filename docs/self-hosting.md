# Self-hosting Questory Labs

## License limits

Self-hosting of the community stack is allowed only under the [PolyForm Noncommercial License 1.0.0](../LICENSE):

- **Allowed:** personal use, hobby projects, and other noncommercial purposes (including many educational / charitable uses as defined in the license).
- **Not allowed under this license:** selling the software, charging for access/hosting of this software as a product, or other use primarily for commercial advantage or monetary compensation. Ask the copyright holder for a commercial license if you need that.
- **Attribution / notices:** if you redistribute the software (or a modified version), you must include the license terms (or the PolyForm URL) and any `Required Notice:` lines from `LICENSE`.
- This project is **source-available**, not OSI open source. Do not assume MIT/Apache-style commercial rights.

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
Music (optional): `http://localhost:4010`  
Watch (optional): `http://localhost:4020`

`GET /health` on the API reports `mode`, database provider, Redis/sync mode, and whether the Steam allowlist is enabled (not the IDs). Music exposes `GET /health` (`questorylabs-music`); watch exposes `GET /health` (`questorylabs-watch`).

**One database:** Steam API, music, and watch all use the same `DATABASE_URL` (SQLite file volume or Postgres `questorylabs`). Schema lives in `packages/db`. Identity is a shared `User` row (Steam OpenID, music ingest token, Trakt/AniList connections).

### Docker Hub images

| Image | Service |
|-------|---------|
| `santoshpanna/questorylabs-api` | `api` / `api-lite` (SQLite or Postgres chosen at runtime) |
| `santoshpanna/questorylabs-web` | `web` |
| `santoshpanna/questorylabs-cron` | `cron` |
| `santoshpanna/questorylabs-music` | `music` / `music-lite` (optional ListenBrainz ingest + analytics) |
| `santoshpanna/questorylabs-watch` | `watch` / `watch-lite` (optional movie/TV ingest + analytics) |

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

## Music analytics (optional)

Questory Music is a **separate** service. It does not collect plays itself — deploy [multi-scrobbler](https://github.com/foxxmd/multi-scrobbler) (or any ListenBrainz-compatible client) and point it at Music.

### Enable the stack

Music **shares the same database** as the Steam API (same `DATABASE_URL` — one SQLite file or the `questorylabs` Postgres DB). Schema is owned by `packages/db`.

1. Turn on the web flag (rebuild web after changing `NEXT_PUBLIC_*`). Ingest tokens are **per-user** — mint them in **Settings → Profile** after Steam login (not env vars):

```env
NEXT_PUBLIC_ENABLE_MUSIC=true
NEXT_PUBLIC_MUSIC_URL=http://localhost:4010
```

Share `SESSION_SECRET` with the API so music analytics can read the session cookie.

2. Start Music alongside your mode (same DB volume / Postgres as API):

```bash
# Lite — shares sqlite_data / questorylabs.db with api-lite
docker compose --profile selfhosted --profile music up -d --build

# Full — shares postgres DB questorylabs with api
docker compose --profile selfhosted-full --profile music-pg up -d --build
```

Locally without Docker: `pnpm setup` (pushes shared schema) then `pnpm dev:music`.

### Point multi-scrobbler at Questory Music

Use multi-scrobbler’s [ListenBrainz client](https://docs.multi-scrobbler.app/configuration/clients/listenbrainz/) (or the [Koito client](https://docs.multi-scrobbler.app/configuration/clients/koito/) pattern):

| Variable | Value |
|----------|--------|
| `LZ_URL` / base URL | `http://<music-host>:4010` (or `http://<music-host>:4010/apis/listenbrainz`) |
| `LZ_TOKEN` / API key | token from Settings → Profile (music ingest key) |
| `LZ_USER` | ListenBrainz username shown on Profile (auto-created slug) |

Music accepts:

- `POST /1/submit-listens` and `POST /apis/listenbrainz/1/submit-listens`
- `GET /1/validate-token`
- `GET /1/user/:user/listens` (for MS duplicate detection)
- `GET /1/user/:user/listen-count`
- `GET /1/user/:user/playing-now`

Analytics live only on the music service (`/v1/analytics/*`). The Steam API does not proxy music data.

### Import listening history

Bulk-import past listens from **Music → Sources** (or `POST /v1/imports` with multipart field `file`). Formats match [Koito’s importers](https://koito.io/guides/importing/):

| Source | Typical filename hint |
|--------|------------------------|
| Koito SQLite DB | `koito.db` / `*.sqlite` |
| Koito JSON export | `koito*.json` (`version: "1"`) |
| Spotify extended history | `Streaming_History_Audio*.json` |
| Maloja export | `*maloja*.json` |
| Last.fm (ghan.nl JSON) | `*recenttracks*.json` |
| ListenBrainz export zip | `*listenbrainz*.zip` |

Import runs asynchronously; poll `GET /v1/imports/:jobId` for progress. Duplicates are skipped via `(userId, trackId, listenedAt)`.

### Frontend menus

The web app shows **Music** nav items only when **both** are true:

1. `NEXT_PUBLIC_ENABLE_MUSIC=true` (baked at web image build time)
2. A successful client ping to `${NEXT_PUBLIC_MUSIC_URL}/health` with `ok: true`

If Music is down or the flag is off, the Steam UI is unchanged.

## Watch analytics (optional)

Questory Watch ingests movie/TV history into the **same shared database** and `User` as Steam/music.

### Enable the stack

```env
NEXT_PUBLIC_ENABLE_WATCH=true
NEXT_PUBLIC_WATCH_URL=http://localhost:4020
TRAKT_CLIENT_ID=...
TRAKT_CLIENT_SECRET=...
TRAKT_REDIRECT_URI=http://localhost:4020/v1/trakt/callback
TMDB_API_KEY=...   # TMDB API key or v4 read token
# Optional:
# ANILIST_CLIENT_ID / ANILIST_CLIENT_SECRET / ANILIST_REDIRECT_URI
# (default redirect: http://localhost:4020/v1/anilist/callback)
SESSION_SECRET=same-as-api                # watch verifies the Steam session cookie
```

**Plex / Jellyfin:** mint a `watch_webhook` ApiKey in **Settings → Watch** (or Profile). Send it as header `x-watch-webhook-secret` — there is no global `WATCH_WEBHOOK_SECRET` env.

**Multi-user / non-local:** share `SESSION_SECRET` with the API, and serve API + watch (+ web) under a common site (or `COOKIE_DOMAIN`) so the browser sends `questorylabs_session` to watch. Trakt/AniList/Letterboxd routes require that session (or sole-user fallback only in `local`/`selfhosted` with exactly one user and no `userId` query).

```bash
# Lite — shares sqlite_data with api-lite
docker compose --profile selfhosted --profile watch up -d --build

# Full — shares postgres questorylabs with api
docker compose --profile selfhosted-full --profile watch-pg up -d --build
```

Locally: `pnpm setup` then `pnpm dev:watch`.

### Sources

| Source | How |
|--------|-----|
| **Trakt** | OAuth at `/v1/trakt/authorize` → history + ratings + watchlist sync |
| **TMDB** | Metadata enrichment (genres, posters, runtime). Attribution required in UI. |
| **Letterboxd** | Official diary CSV upload only (`POST /v1/imports/letterboxd`) — no scraping |
| **AniList** | OAuth + list sync (day/unknown precision) |
| **Plex / Jellyfin** | `POST /webhooks/plex` and `POST /webhooks/jellyfin` (unversioned) |

Cron (when enabled) hits `/v1/internal/cron/trakt-sync` and `/v1/internal/cron/anilist-sync` on the watch service every 6 hours (`CRON_WATCH_SCHEDULE`).

### Frontend menus

Watch nav appears when `NEXT_PUBLIC_ENABLE_WATCH=true` **and** `${NEXT_PUBLIC_WATCH_URL}/health` returns `ok: true`.

## Steam OpenID URLs

- `STEAM_REALM` and `STEAM_RETURN_URL` must use the **API** origin.
- `STEAM_REALM` must be a prefix of `STEAM_RETURN_URL`.
- Example: realm `https://api.example.com`, return `https://api.example.com/auth/steam/callback`.
- `WEB_ORIGIN` is the browser app origin (CORS + post-login redirect).
- `NEXT_PUBLIC_API_URL` is baked into the web image at **build** time — rebuild web after changing it.

## Auth (email + password)

Sign-up and sign-in use **email + password only**. Steam OpenID is link-only from **Connections** (requires an existing session).

- `ADMIN_EMAILS` — comma-separated emails granted `isAdmin` on register/login (also checked at request time). The first user is **not** admin unless listed here.
- Signup is always open while `count(isAdmin)=0`. After that, admins toggle signup in **Admin → Settings** (`AppConfig.signupEnabled`).
- Abuse protection: signed challenges, honeypots, min form-fill time, IP/email rate limits, login lockout, Origin checks. Prefer Redis (`REDIS_URL`) for multi-instance rate limits.
- `TRUST_PROXY=true` when behind a reverse proxy so client IP / rate limits use `X-Forwarded-For`.
- `AUTH_BLOCKED_EMAIL_DOMAINS` — extra disposable domains to reject on signup.

## Steam ID allowlist (linking)

Set `ALLOWED_STEAM_IDS` to a comma-separated list of 17-digit SteamIDs (find yours via [steamid.io](https://steamid.io) or similar):

```env
ALLOWED_STEAM_IDS=76561198000000000,76561198000000001
```

- Non-empty: only listed SteamIDs can be **linked** from Connections (others get `?error=not_allowed`).
- Empty / unset: any Steam account may be linked by a signed-in user.

Recommended for private `selfhosted` / `selfhosted-full` deployments.

## Reverse proxy tip

Prefer a **same-origin** setup (e.g. `https://games.example.com` for the UI and `https://games.example.com/api` proxied to the API). That avoids cross-site cookie issues. If you use separate hosts (`app.` + `api.` + `watch.`), set HTTPS everywhere, `COOKIE_DOMAIN=.example.com`, matching CORS `WEB_ORIGIN`, and the **same** `SESSION_SECRET` on API and watch so music/watch browser calls can authenticate.

See also [testing.md](./testing.md) for the security test suite.

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

Browser path `/api/v1/library` becomes Nest `/v1/library` after `strip_prefix /api`. Steam auth and health stay unversioned at the API root; resource APIs live under `/v1`.

## Backups

**Lite (SQLite):** copy the Docker volume file (default DB path inside the container: `/data/questorylabs.db`), or back up the `sqlite_data` volume. API, music, and watch share this file.

**Full / production (Postgres):** use `pg_dump` against the `postgres` service, or snapshot the `postgres_data` volume. Steam + music + watch tables live in the same `questorylabs` database. Redis holds cache, locks, and in-flight jobs — back it up only if you care about queue state.

## Daily sync cron

Full / production Compose profiles include an optional `cron` service. It does **not** talk to Steam directly — it calls API endpoints:

- `POST /v1/internal/cron/daily-refresh` — enqueue `library-sync` + `metadata-refresh` for every logged-in user
- `POST /v1/internal/cron/recover-failed-sync` — clear stuck `SyncJob` rows and catalog lock/failed state

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
- Music ingest / watch webhook tokens — mint per-user ApiKeys in Settings (not env vars)
- `TRAKT_CLIENT_ID` / `TRAKT_CLIENT_SECRET` — required for Trakt OAuth on watch
- `TMDB_API_KEY` — required for watch metadata enrichment (keep TMDB attribution in the UI)
- Change default Postgres password in compose for any internet-facing host
- Never commit `.env`

## Schema deploy note

Canonical schema: `packages/db/prisma/schema.template.prisma`. Use `pnpm db:generate` / `pnpm db:push` from the repo root. Containers run `prisma db push` on start against that shared schema.
