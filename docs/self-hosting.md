# Self-hosting Questory

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
| `production` | Same as full + public HTTPS checks | Hardened public HTTPS / multi-user instance |

**Caching:** the API always caches (in-memory by default). Set `REDIS_URL` to share cache and enrich locks across processes and enable BullMQ sync queues. Without Redis, game metadata freshness still applies via DB timestamps (`metadataSyncedAt` — skip Steam re-enrich for ~1 day), so concurrent syncs on a single process do not re-scan the same games.

Copy the matching template to `.env`, then set secrets:

```bash
cp .env.selfhosted.example .env          # or .env.selfhosted-full.example / .env.production.example
# edit SESSION_SECRET, STEAM_API_KEY, URLs, optional ALLOWED_STEAM_IDS
```

## Quick deploy

Build from this repo with `--build`. Prebuilt images are optional if you configure image names/tags in `.env`.

### Release channels

Published images use three rolling channels. `:latest` always tracks **stable** (same as `:stable`).

| Channel | Rolling tag | Version tag (pin exact build) |
|---------|-------------|----------------------------------|
| stable | `stable`, `latest` | `vX.Y.Z` |
| rc | `rc` | `vX.Y.Z-rc.N` |
| canary | `canary` | `vX.Y.Z-canary.N` |

Canary and RC version tags are semver pre-releases derived from git release tags. Canary builds on `main` auto-increment `N` for the active release line.

Pin an exact version or follow a channel via `IMAGE_TAG` in `.env`:

```bash
# stable (default)
IMAGE_TAG=latest
# IMAGE_TAG=stable

# release candidate or canary (rolling channel tags)
# IMAGE_TAG=rc
# IMAGE_TAG=canary

# pinned semver
# IMAGE_TAG=v1.2.3
# IMAGE_TAG=v1.3.0-rc.1
# IMAGE_TAG=v1.3.0-canary.5
```

Compose defaults to `PULL_POLICY=always`, so rolling channel tags (`rc`, `canary`, `stable`, `latest`) update on `docker compose up`. Set `PULL_POLICY=missing` in `.env` to skip registry checks when you pin an exact version and want faster startups.

Pull examples:

```bash
docker pull santoshpanna/questorylabs-api:stable
docker pull ghcr.io/questory-labs/questorylabs-api:rc
docker pull ghcr.io/questory-labs/questorylabs-web:canary
```

**Lite (SQLite):**

```bash
pnpm docker:selfhosted -- --build
```

**Full (Postgres + Redis):**

```bash
pnpm docker:selfhosted-full -- --build
```

**Production profile** (same services as full; set `APP_MODE=production` and public HTTPS URLs in `.env`):

```bash
pnpm docker:prod -- --build
```

Web: `http://localhost:3000` (or your `WEB_ORIGIN`)  
API: `http://localhost:4000` (or your public API URL) — Steam, music, watch, and optional in-process cron

`GET /health` on the API reports `mode`, database provider, Redis/sync mode, whether the Steam allowlist is enabled (not the IDs), and `music.enabled` / `watch.enabled` / `read.enabled` for the web soft-gates.

**One database:** Steam, music, watch, and read all use the same `DATABASE_URL` (SQLite file volume or Postgres `questorylabs`). Schema lives in `packages/db`. Identity is a shared `User` row (Steam OpenID, music ingest token, Trakt/AniList connections).

`NEXT_PUBLIC_API_URL` is read at **container start** from the web service environment (written into `/runtime-env.js`). Hub-pulled images honor compose `environment` without a rebuild. Build-args remain defaults only.

```bash
# example: LAN / reverse-proxy URL
NEXT_PUBLIC_API_URL=http://192.168.1.111:4000 docker compose -f docker-compose.enterprise.yml up -d
```

Pushes/PRs to `main` run CI tests per package when a `test` script exists; otherwise that package is skipped.

## Music analytics (optional)

Questory Music runs **inside the Steam API** (`apps/api`). Live plays can come from **native Last.fm polling** (Music → Sources → Connect Last.fm) or from [multi-scrobbler](https://github.com/foxxmd/multi-scrobbler) / any ListenBrainz-compatible client. Connecting a native scrobbler **disables** ListenBrainz ingest for that user — `/1/*` requests are rejected with 403 until they disconnect.

### Enable

Music **shares the same database** as Steam (same `DATABASE_URL`). Schema is owned by `packages/db`.

1. Turn on the web flag (`NEXT_PUBLIC_ENABLE_MUSIC=true` on the web service). Ingest tokens are **per-user** — mint them in **Settings → Profile** after Steam login (not env vars), unless native Last.fm is connected:

```env
NEXT_PUBLIC_ENABLE_MUSIC=true
```

Session APIs live at `/v1/music/*` on the API origin (same process and port as Steam).

2. Start the normal API (music modules load with it). Locally: `pnpm setup` then `pnpm dev`.

### Native Last.fm source

Create an API account at [last.fm/api/account/create](https://www.last.fm/api/account/create) and set:

```env
LASTFM_API_KEY=
LASTFM_API_SECRET=
LASTFM_REDIRECT_URI=http://localhost:4000/v1/music/scrobbler/lastfm/callback
```

The callback URL must match what you register on the Last.fm API account **exactly** (no trailing slash, no extra query string). If Last.fm shows “Application authenticated / close your browser” instead of sending you back, the Callback URL on that API account is wrong or missing — set it to the same value as `LASTFM_REDIRECT_URI`, then return to Music → Sources; Questory will finish the session on the next status load.

Native Last.fm polling runs in the API process. Set `SCROBBLER_IN_API=false` to run it in the optional `scrobbler` service instead.

### Point multi-scrobbler at Questory Music

Use this path only when the user has **not** connected a native Last.fm/Spotify source. Multi-scrobbler’s [ListenBrainz client](https://docs.multi-scrobbler.app/configuration/clients/listenbrainz/) (or the [Koito client](https://docs.multi-scrobbler.app/configuration/clients/koito/) pattern):

| Variable | Value |
|----------|--------|
| `LZ_URL` / base URL | `http://<api-host>:4000` (or `http://<api-host>:4000/apis/listenbrainz`) |
| `LZ_TOKEN` / API key | token from Settings → Profile (music ingest key) |
| `LZ_USER` | ListenBrainz username shown on Profile (auto-created slug) |

Music accepts on the API:

- `POST /1/submit-listens` and `POST /apis/listenbrainz/1/submit-listens`
- `GET /1/validate-token`
- `GET /1/user/:user/listens` (for MS duplicate detection)
- `GET /1/user/:user/listen-count`
- `GET /1/user/:user/playing-now`

Analytics live at `/v1/music/analytics/*` (same API process).

### Import listening history

Bulk-import past listens from **Music → Sources** (or `POST /v1/music/imports` with multipart field `file`). Formats match [Koito’s importers](https://koito.io/guides/importing/):

| Source | Typical filename hint |
|--------|------------------------|
| Koito SQLite DB | `koito.db` / `*.sqlite` |
| Koito JSON export | `koito*.json` (`version: "1"`) |
| Spotify extended history | `Streaming_History_Audio*.json` |
| Maloja export | `*maloja*.json` |
| Last.fm (ghan.nl JSON) | `*recenttracks*.json` |
| ListenBrainz export zip | `*listenbrainz*.zip` |

Import runs asynchronously; poll `GET /v1/music/imports/:jobId` for progress. Duplicates are skipped via `(userId, trackId, listenedAt)`.

### Frontend menus

The web app shows **Music** nav items only when **both** are true:

1. `NEXT_PUBLIC_ENABLE_MUSIC=true` (baked at web image build time)
2. API `GET /health` reports `ok: true` and `music.enabled` is not `false`

If the flag is off or the API health check fails, the Steam UI is unchanged.

## Watch analytics (optional)

Questory Watch is an **API module** under `/v1/watch/*`. It ingests movie/TV history into the **same shared database** and `User` as Steam/music. Webhooks stay unversioned at `/webhooks/*` on the API.

### Enable

```env
NEXT_PUBLIC_ENABLE_WATCH=true
TRAKT_CLIENT_ID=...
TRAKT_CLIENT_SECRET=...
TRAKT_REDIRECT_URI=http://localhost:4000/v1/watch/trakt/callback
TMDB_API_KEY=...   # TMDB API key or v4 read token
# Optional:
# ANILIST_CLIENT_ID / ANILIST_CLIENT_SECRET / ANILIST_REDIRECT_URI
# (default redirect: http://localhost:4000/v1/watch/anilist/callback)
```

Watch session APIs live at `/v1/watch/*` on the API origin; webhooks at `/webhooks/*` (same process and port as Steam).

**Plex / Jellyfin:** mint a `watch_webhook` ApiKey in **Settings → Watch** (or Profile). Send it as header `x-watch-webhook-secret` — there is no global `WATCH_WEBHOOK_SECRET` env.

**Multi-user / non-local:** serve API + web under a common site (or `COOKIE_DOMAIN`) so the browser sends `questorylabs_session` to the API. Trakt/AniList/Letterboxd routes require that session (or sole-user fallback only in `local`/`selfhosted` with exactly one user and no `userId` query).

Locally: `pnpm setup` then `pnpm dev` (watch modules load with the API).

### Sources

| Source | How |
|--------|-----|
| **Trakt** | OAuth at `/v1/watch/trakt/authorize` → history + ratings + watchlist sync |
| **TMDB** | Metadata enrichment (genres, posters, runtime). Attribution required in UI. |
| **Letterboxd** | CSV/zip import (`POST /v1/watch/imports/letterboxd`) **or** optional scrape sync: connect username at `/v1/watch/letterboxd/connect`, configure selectors in **Admin → Scrapers**, cron runs with `watch-sync` |
| **AniList** | OAuth + list sync (day/unknown precision) |
| **MyAnimeList** | OAuth + PKCE at `/v1/watch/mal/authorize` → anime + manga import |
| **Shikimori** | OAuth at `/v1/watch/shikimori/authorize` → anime + manga import |
| **Bangumi** | OAuth at `/v1/watch/bangumi/authorize` → collection import |
| **Kitsu** | Email/password connect at `POST /v1/watch/kitsu/connect` → library import |
| **Plex / Jellyfin** | `POST /webhooks/plex` and `POST /webhooks/jellyfin` on the API (unversioned) |
| **qMonitor** | Device login (auth code + PKCE) + `POST /webhooks/qmonitor` — see below |

### qMonitor device login

qMonitor can use either host as `baseUrl`:

- `https://app.example.com` (FE) or `https://api.example.com` (BE)

On save/test it probes **`GET {baseUrl}/api/health`**:

| `service` | Meaning | Token / webhook root | Consent UI |
|-----------|---------|----------------------|------------|
| `fe` | Next.js web | `{baseUrl}/api` (exclusive handlers proxy to Nest) | `{baseUrl}/oauth/qmonitor/authorize` |
| `be` | Nest API | `{baseUrl}` | `{webOrigin}/oauth/qmonitor/authorize` from health JSON |

FE handlers (no catch-all rewrite):

- `GET /api/health` → `{ ok: true, service: "fe" }`
- `POST /api/oauth/qmonitor/token` → Nest
- `POST /api/oauth/qmonitor/revoke` → Nest
- `POST /api/webhooks/qmonitor` → Nest

BE also exposes `GET /api/health` → `{ ok: true, service: "be", webOrigin }`.

Auth is **not** OIDC discovery: auth-code + PKCE, device-bound refresh tokens (anti-exfil), short-lived access tokens checked against revoked device sessions on webhook ingest.

By default the API schedules Trakt, AniList, MAL, Kitsu, Bangumi, Shikimori, and Letterboxd scrape sync every 6 hours (`CRON_WATCH_SCHEDULE`; disable with `CRON_ENABLED=false`).

**Letterboxd scrape (optional):** admins define CSS selectors and URL macros under **Admin → Scrapers**. Users connect a Letterboxd username in **Watch → Sources**. Scraped entries share dedupe keys with CSV imports. For Playwright engine configs, install browser binaries once: `pnpm --filter @questorylabs/api exec playwright install chromium`.

### Frontend menus

Watch nav appears when `NEXT_PUBLIC_ENABLE_WATCH=true` **and** API `GET /health` reports `ok: true` with `watch.enabled` not `false`.

### Optional: Read (manga / print)

Questory Read is an **API module** under `/v1/read/*`. It syncs manga/manhwa/novels from AniList, MyAnimeList, Kitsu, Bangumi, and Shikimori into dedicated Read tables (not Watch `Title` / `WatchEvent`).

```env
NEXT_PUBLIC_ENABLE_READ=true
# AniList / MAL / Shikimori / Bangumi OAuth — see Watch section
# Kitsu: connect in Read → Sources (email + password; tokens only stored)
```

Read nav appears when `NEXT_PUBLIC_ENABLE_READ=true` **and** API `GET /health` reports `ok: true` with `read.enabled` not `false`. Connect AniList under **Read → Sources** (or Watch → Sources — shared connection), then sync. Cron AniList sync also refreshes manga.

## Steam OpenID URLs

- `STEAM_REALM` and `STEAM_RETURN_URL` must use the **API** origin.
- `STEAM_REALM` must be a prefix of `STEAM_RETURN_URL`.
- Example: realm `https://api.example.com`, return `https://api.example.com/auth/steam/callback`.
- `WEB_ORIGIN` is the browser app origin (CORS + post-login redirect).
- `NEXT_PUBLIC_API_URL` (and related `NEXT_PUBLIC_*` / `ENTERPRISE`) are applied at **web container start** via `/runtime-env.js` — set them in compose `environment` (no rebuild required for Hub images).

## Auth (email + password)

Sign-up and sign-in use **email + password only**. Steam OpenID is link-only from **Connections** (requires an existing session).

- `ADMIN_EMAILS` — comma-separated emails granted `isAdmin` on register/login (also checked at request time). The first user is **not** admin unless listed here.
- Signup is always open while `count(isAdmin)=0`. After that, admins toggle signup in **Admin → Settings** (`AppConfig.signupEnabled`).
- Optional SMTP (`SMTP_ENABLED=true` plus `SMTP_HOST` / `SMTP_FROM`): email verification, magic-link sign-in, and password reset. Inactive when unset — password login works as today. Magic-link signup still respects the signup toggle (invite-only instances do not create unknown emails).
- `QUESTORY_CLOUD=true` (hosted instance only): SMTP is required at boot; unverified users are walled; Recommendations and Rewind AI need an instance kill-switch **and** a per-user grant in Admin → Users. Self-host with QEngine keeps those features for everyone when the instance switch is on.
- Abuse protection: signed challenges, honeypots, min form-fill time, IP/email rate limits, login lockout, Origin checks, plus a global API rate limit. Prefer Redis (`REDIS_URL`) for multi-instance rate limits.
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

Prefer a **same-origin** setup (e.g. `https://games.example.com` for the UI and `https://games.example.com/api` proxied to the API). That avoids cross-site cookie issues. If you use separate hosts (`app.` + `api.`), set HTTPS everywhere, `COOKIE_DOMAIN=.example.com`, and matching CORS `WEB_ORIGIN`.

See also [testing.md](./testing.md) for the security test suite.

## QEngine security

- The browser should **not** call QEngine for product features. All recommendations, dossier, settings, guardrails, and telemetry admin routes go through the Nest API (`/v1/recommendations`, `/v1/enterprise/*`), which validates the session and proxies with a short-lived internal bearer token.
- Direct browser access to QEngine is limited to **`GET /health`** (ops probe). Feature gating uses **`GET /v1/enterprise/status`** on the API (public proxy).
- Set **`ENTERPRISE_INTERNAL_SECRET`** to the same long random value in the API and QEngine containers. QEngine rejects browser session cookies on protected routes.
- Keep QEngine on the **internal Docker network** (`ENTERPRISE_URL=http://enterprise:4030` from the API). Do not publish OTEL ports `:4040` / `:4318` to the host — they bind localhost inside the QEngine process only.

Example Caddy sketch (same host, path split):

```caddy
games.example.com {
  handle /auth/* {
    reverse_proxy api:4000
  }
  handle /health {
    reverse_proxy api:4000
  }
  handle /1/* {
    reverse_proxy api:4000
  }
  handle /webhooks/* {
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

Browser path `/api/v1/library` becomes Nest `/v1/library` after `strip_prefix /api`. Steam auth and health stay unversioned at the API root; resource APIs live under `/v1`. ListenBrainz ingest stays at `/1/*`; watch webhooks at `/webhooks/*`.

## Backups

**Lite (SQLite):** copy the Docker volume file (default DB path inside the container: `/data/questorylabs.db`), or back up the `sqlite_data` volume. Steam, music, and watch share this file.

**Full / production (Postgres):** use `pg_dump` against the `postgres` service, or snapshot the `postgres_data` volume. Steam + music + watch tables live in the same `questorylabs` database. Redis holds cache, locks, and in-flight jobs — back it up only if you care about queue state.

## Daily sync cron

Cron runs **in-process** inside the API by default (opt out with `CRON_ENABLED=false`). It schedules the same work as the internal cron HTTP routes:

- Daily library sync — enqueue `library-sync` for every Steam-linked user (owned games + friends)
- Daily price sync — enqueue `metadata-refresh` for every Steam-linked user (prices for owned + friend-cached games)
- Recover failed sync — clear stuck `SyncJob` rows and catalog lock/failed state
- Watch Trakt/AniList sync on `CRON_WATCH_SCHEDULE` (when watch is in use)

Scheduled ticks and admin/HTTP triggers write `CronRun` rows (`triggeredBy`: `system` | `admin` | `cron`) visible under `/admin/cron`.

```env
# Default: on. Disable in-process scheduling (e.g. external-only HTTP cron):
# CRON_ENABLED=false
CRON_SECRET=a-long-random-shared-secret
```

`CRON_SECRET` is required only for `POST /v1/internal/cron/*` (Bearer / `x-cron-secret`). Admin triggers use the admin session; in-process ticks do not need the secret.

## Secrets checklist

- `SESSION_SECRET` — long random string (API rejects weak placeholders in non-local modes)
- `STEAM_API_KEY` — [Steam Web API key](https://steamcommunity.com/dev/apikey)
- `CRON_SECRET` — required for `/v1/internal/cron/*` HTTP callers (optional if you only use in-process cron)
- Music ingest / watch webhook tokens — mint per-user ApiKeys in Settings (not env vars)
- `TRAKT_CLIENT_ID` / `TRAKT_CLIENT_SECRET` — required for Trakt OAuth (watch module)
- `TMDB_API_KEY` — required for watch metadata enrichment (keep TMDB attribution in the UI)
- Change default Postgres password in compose for any internet-facing host
- Never commit `.env`

## Schema deploy note

Canonical schema: `packages/db/prisma/schema.template.prisma`. Use `pnpm db:generate` / `pnpm db:push` from the repo root. Containers run `prisma db push` on start against that shared schema.
