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

`NEXT_PUBLIC_API_URL` is baked into the **web** image at build time (default `http://localhost:4000`). For a custom public API URL, rebuild web:

```bash
NEXT_PUBLIC_API_URL=https://api.example.com pnpm docker:selfhosted-full -- --build
```

Pushes/PRs to `main` run CI tests per package when a `test` script exists; otherwise that package is skipped.

## Music analytics (optional)

Questory Music runs **inside the Steam API** (`apps/api`). It does not collect plays itself — deploy [multi-scrobbler](https://github.com/foxxmd/multi-scrobbler) (or any ListenBrainz-compatible client) and point it at the API.

### Enable

Music **shares the same database** as Steam (same `DATABASE_URL`). Schema is owned by `packages/db`.

1. Turn on the web flag (rebuild web after changing `NEXT_PUBLIC_*`). Ingest tokens are **per-user** — mint them in **Settings → Profile** after Steam login (not env vars):

```env
NEXT_PUBLIC_ENABLE_MUSIC=true
```

Session APIs live at `/v1/music/*` on the API origin (same process and port as Steam).

2. Start the normal API (music modules load with it). Locally: `pnpm setup` then `pnpm dev`.

### Point multi-scrobbler at Questory Music

Use multi-scrobbler’s [ListenBrainz client](https://docs.multi-scrobbler.app/configuration/clients/listenbrainz/) (or the [Koito client](https://docs.multi-scrobbler.app/configuration/clients/koito/) pattern):

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
| **Letterboxd** | Official export zip or CSV (`POST /v1/watch/imports/letterboxd`, optional `include=diary,ratings,watched,watchlist`) — no scraping |
| **AniList** | OAuth + list sync (day/unknown precision) |
| **Plex / Jellyfin** | `POST /webhooks/plex` and `POST /webhooks/jellyfin` on the API (unversioned) |

By default the API schedules Trakt/AniList sync every 6 hours (`CRON_WATCH_SCHEDULE`; disable with `CRON_ENABLED=false`).

### Frontend menus

Watch nav appears when `NEXT_PUBLIC_ENABLE_WATCH=true` **and** API `GET /health` reports `ok: true` with `watch.enabled` not `false`.

### Optional: Read (manga / print)

Questory Read is an **API module** under `/v1/read/*`. It syncs AniList manga/manhwa/novels into dedicated Read tables (not Watch `Title` / `WatchEvent`).

```env
NEXT_PUBLIC_ENABLE_READ=true
# Same AniList OAuth as Watch — anime lists → Watch, manga lists → Read
# ANILIST_CLIENT_ID / SECRET / REDIRECT_URI (see Watch section)
```

Read nav appears when `NEXT_PUBLIC_ENABLE_READ=true` **and** API `GET /health` reports `ok: true` with `read.enabled` not `false`. Connect AniList under **Read → Sources** (or Watch → Sources — shared connection), then sync. Cron AniList sync also refreshes manga.

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

Prefer a **same-origin** setup (e.g. `https://games.example.com` for the UI and `https://games.example.com/api` proxied to the API). That avoids cross-site cookie issues. If you use separate hosts (`app.` + `api.`), set HTTPS everywhere, `COOKIE_DOMAIN=.example.com`, and matching CORS `WEB_ORIGIN`.

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

- Daily refresh — enqueue `library-sync` + `metadata-refresh` for every logged-in user
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
