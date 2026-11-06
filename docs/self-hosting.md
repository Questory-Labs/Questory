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
| `production` | Same as full + boot checks that reject localhost URLs | Public multi-user instance behind HTTPS |

`production` does not terminate or enforce TLS: it only refuses to boot with localhost `STEAM_REALM`, `STEAM_RETURN_URL`, `WEB_ORIGIN` or `NEXT_PUBLIC_API_URL`. Put a TLS-terminating [reverse proxy](#reverse-proxy-tip) in front.

**Caching:** the API always caches (in-memory by default). Set `REDIS_URL` to share cache and enrich locks across processes and enable BullMQ sync queues. Without Redis, game metadata freshness still applies via DB timestamps (`metadataSyncedAt` — skip Steam re-enrich for ~1 day), so concurrent syncs on a single process do not re-scan the same games.

Copy the matching template to `.env`, then set secrets:

```bash
cp .env.selfhosted.example .env          # or .env.selfhosted-full.example / .env.production.example
# edit SESSION_SECRET, STEAM_API_KEY, URLs, optional ALLOWED_STEAM_IDS
```

Generate secrets; do not keep the template values. The boot check rejects empty, `change-me*` and under-16-character secrets, but `replace-with-a-long-random-string` from the lite and full templates **passes it**:

```bash
openssl rand -hex 32
```

Boot checks live in the API. On a bad config the API (and the scrobbler worker) exits with `Invalid configuration for APP_MODE=...` and lists each problem; `restart: unless-stopped` then keeps retrying. Read it with `docker compose --profile <profile> logs api-lite` (lite) or `logs api` (full / production).

## How Compose reads `.env`

`docker-compose.yml` has no `env_file`. `.env` only fills the `${VAR}` references written in that file, so three groups behave differently from what the templates suggest:

- **Set by the profile, not `.env`:** `DATABASE_PROVIDER`, `DATABASE_URL`, `REDIS_URL`, `USE_INLINE_SYNC` and `API_PORT` are literal values per service. Changing them in `.env` has no effect, including the `CHANGE_ME` in `DATABASE_URL` of `.env.production.example`.
- **Mapped:** `FEATURE_MUSIC|WATCH|READ` come from `NEXT_PUBLIC_ENABLE_*`. A `FEATURE_*` line in `.env` has no effect.
- **Not forwarded:** `CRON_FRIENDS_SCHEDULE` (legacy; use `CRON_PRICE_SCHEDULE`). `docker-compose.yml` sets the price schedule, so the legacy name never applies.

Every other API variable in this guide reaches the container from `.env`, except `ENTERPRISE_*`, which only `docker-compose.enterprise.yml` sets. For anything else, such as the port changes below, add a `docker-compose.override.yml` next to `docker-compose.yml`. Compose merges it automatically unless you pass `-f`.

`docker-compose.enterprise.yml` keeps its own, shorter list. It forwards `ADMIN_EMAILS` and reads `DATABASE_URL` from `.env`, but not `TRUST_PROXY`, `TRUST_CLOUDFLARE`, `COOKIE_SECURE`, `AUTH_*` or the `MAL_*`, `SHIKIMORI_*` and `BANGUMI_*` groups.

### Lock down Postgres, Redis and the password

The full and production profiles publish Postgres on `5432` and Redis on `6379` on **all host interfaces**. Redis has no password, and Postgres uses `questorylabs` / `questorylabs`. Docker-published ports can bypass host firewalls such as `ufw`. On any host reachable from an untrusted network, remove them and change the password in a `docker-compose.override.yml` (`!reset` needs Compose 2.24+):

```yaml
services:
  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports: !reset []
  redis:
    ports: !reset []
  api:
    environment:
      DATABASE_URL: postgresql://questorylabs:${POSTGRES_PASSWORD}@postgres:5432/questorylabs
  scrobbler:
    environment:
      DATABASE_URL: postgresql://questorylabs:${POSTGRES_PASSWORD}@postgres:5432/questorylabs
```

Use a URL-safe password such as `openssl rand -hex 32`. `POSTGRES_PASSWORD` only applies when the volume is first created; on an existing volume, also run `ALTER USER questorylabs PASSWORD '...'` in `psql`.

## Feature flags (Music, Watch, Read, data sources)

1. **Admin → Settings** is the control once a flag is saved (`AppConfig` keys such as `feature.music` / `source.trakt`).
2. **Env** is the unsaved fallback: `FEATURE_MUSIC|WATCH|READ` wins over `NEXT_PUBLIC_ENABLE_*` (same names as today so a root `.env` still works). Domains default **off**; data sources default **on**. Under Compose, set `NEXT_PUBLIC_ENABLE_*`, because `FEATURE_*` is overwritten from it.
3. The **UI** reads `GET /v1/status` **once per load**. Mid-session admin changes do not update nav until reload; the API still returns 403.
4. **`GET /health`** is liveness only (`ok` + `service`). Do not curl it for flags.
5. Do not confuse this with **`GET /v1/enterprise/status`** (QEngine).

Compose in this version maps `FEATURE_*` from `NEXT_PUBLIC_ENABLE_*` onto **`api`**, **`api-lite`**, and **`scrobbler`**. Pulling a new Hub image with an old compose file is **unsupported** — the web no longer treats ENABLE as a live gate, and the API would default domains off.

## Quick deploy

Build from this repo with `--build`, or omit `--build` and Compose pulls the published images from Docker Hub with no extra configuration.

Requires Docker Compose 2.20+. Published images are **`linux/amd64` only**; on ARM hosts (Raspberry Pi, Apple Silicon) build from source with `--build`.

### Release channels

Published images use three rolling channels. `:latest` always tracks **stable** (same as `:stable`).

| Channel | Rolling tag | Version tag (pin exact build) |
|---------|-------------|----------------------------------|
| stable | `stable`, `latest` | `vX.Y.Z` |
| rc | `rc` | `vX.Y.Z-rc.N` |
| canary | `canary` | `vX.Y.Z-canary.N` |

Images are published to Docker Hub (`santoshpanna/questorylabs-{api,web}`) and mirrored to GHCR (`ghcr.io/questory-labs/questorylabs-{api,web}`). The `rc` tag only exists once a release candidate has been published, and none has been so far. Compose's `IMAGE_TAG` pulling `rc` fails until then.

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
docker pull ghcr.io/questory-labs/questorylabs-api:stable
docker pull ghcr.io/questory-labs/questorylabs-web:canary
```

**Lite (SQLite):**

```bash
pnpm docker:selfhosted --build
```

**Full (Postgres + Redis):**

```bash
pnpm docker:selfhosted-full --build
```

**Production profile** (same services as full; set `APP_MODE=production` and public HTTPS URLs in `.env`):

```bash
pnpm docker:prod --build
```

Web: `http://localhost:3000` (or your `WEB_ORIGIN`)  
API: `http://localhost:4000` (or your public API URL) — Steam, music, watch, and optional in-process cron

`GET /health` on the API is a public liveness probe (`ok`, `service`) only. Feature flags live on `GET /v1/status` and Admin → Settings. It does not report app mode, database, Redis, allowlist, or whether third-party keys are configured.

**One database:** Steam, music, watch, and read all use the same `DATABASE_URL` (SQLite file volume or Postgres `questorylabs`). Schema lives in `packages/db`. Identity is a shared `User` row (Steam OpenID, music ingest token, Trakt/AniList connections).

`NEXT_PUBLIC_API_URL` is read at **container start** from the web service environment (written into `/runtime-env.js`). Hub-pulled images honor compose `environment` without a rebuild. Build-args remain defaults only.

```bash
# example: LAN / reverse-proxy URL
NEXT_PUBLIC_API_URL=http://192.168.1.111:4000 docker compose -f docker-compose.enterprise.yml up -d
```

Pushes/PRs to `main` run CI tests per package when a `test` script exists; otherwise that package is skipped.

The `pnpm docker:*` shortcuts run `docker compose --profile <profile> up -d --pull missing` and read `.env` from the repo root. Do not write `pnpm docker:selfhosted -- --build`: pnpm forwards the `--`, so Compose reads `--build` as a service name.

### First run

1. Set `ADMIN_EMAILS` in `.env` and start the stack.
2. Register at the web UI with an email listed in `ADMIN_EMAILS`.
3. Link Steam in **Settings → Connections**.
4. In **Admin → Settings**, turn on Music, Watch or Read as needed, and close signup if the instance is private.

### Day-to-day commands

```bash
docker compose --profile selfhosted logs -f             # follow logs
docker compose --profile selfhosted restart             # restart services
docker compose --profile selfhosted down                # stop; keeps volumes
```

Use the profile you deployed. `down -v` **deletes your database volume**.

Host ports `3000` and `4000` are fixed in `docker-compose.yml`. To change or restrict them, use a `docker-compose.override.yml`, for example `ports: !override ["127.0.0.1:4000:4000"]` on the API service.

### Optional data keys

| Variable | Used for | Without it |
|----------|----------|------------|
| `ITAD_API_KEY` | [IsThereAnyDeal](https://isthereanydeal.com/) prices and price history | Those price features are unavailable |
| `IGDB_CLIENT_ID` / `IGDB_CLIENT_SECRET` | IGDB game data such as multiplayer modes (Twitch developer credentials; `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` are also accepted) | IGDB lookups are skipped |
| `MUSICBRAINZ_USER_AGENT` | Identifies your instance to MusicBrainz, e.g. `QuestoryLabs-Music/0.1 (you@example.com)` | A built-in default is sent |

## Music analytics (optional)

Questory Music runs **inside the Steam API** (`apps/api`). Live plays can come from **native Last.fm polling** (Music → Sources → Connect Last.fm) or from [multi-scrobbler](https://github.com/foxxmd/multi-scrobbler) / any ListenBrainz-compatible client. Connecting a native scrobbler **disables** ListenBrainz ingest for that user — `/1/*` requests are rejected with 403 until they disconnect.

### Enable

Music **shares the same database** as Steam (same `DATABASE_URL`). Schema is owned by `packages/db`.

1. Turn the domain on in **Admin → Settings**, or leave it unsaved and set `FEATURE_MUSIC=true` (or `NEXT_PUBLIC_ENABLE_MUSIC=true`) on every API process. Under Compose, only `NEXT_PUBLIC_ENABLE_MUSIC` applies. Ingest tokens are **per-user** — mint them in **Settings → Profile** after signing in (not env vars), unless native Last.fm is connected:

```env
NEXT_PUBLIC_ENABLE_MUSIC=true
# FEATURE_MUSIC=true  # API outside Compose: wins over NEXT_PUBLIC_ENABLE_MUSIC
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

Native Last.fm polling runs in the API process by default. The full and production profiles also start a `scrobbler` worker; set `SCROBBLER_IN_API=false` to leave polling to it. Lite has no worker and no queue, so keep the default there.

Last.fm credentials are stored encrypted with `MUSIC_CREDS_KEY`, falling back to `SESSION_SECRET`. Set `MUSIC_CREDS_KEY` if you may ever rotate the session secret.

### Point multi-scrobbler at Questory Music

Use this path only when the user has **not** connected native Last.fm. Multi-scrobbler’s [ListenBrainz client](https://docs.multi-scrobbler.app/configuration/clients/listenbrainz/) (or the [Koito client](https://docs.multi-scrobbler.app/configuration/clients/koito/) pattern):

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

The web app shows **Music** nav items from the on-load `GET /v1/status` snapshot (`music.enabled`). After you change flags in Admin, reload the app to update navigation. `GET /health` is not used for this.

## Watch analytics (optional)

Questory Watch is an **API module** under `/v1/watch/*`. It ingests movie/TV history into the **same shared database** and `User` as Steam/music. Webhooks stay unversioned at `/webhooks/*` on the API.

### Enable

```env
NEXT_PUBLIC_ENABLE_WATCH=true
# FEATURE_WATCH=true  # API outside Compose: wins over NEXT_PUBLIC_ENABLE_WATCH
TRAKT_CLIENT_ID=...
TRAKT_CLIENT_SECRET=...
TRAKT_REDIRECT_URI=http://localhost:4000/v1/watch/trakt/callback
TMDB_API_KEY=...   # TMDB API key or v4 read token
# Optional:
# ANILIST_CLIENT_ID / ANILIST_CLIENT_SECRET / ANILIST_REDIRECT_URI
# (default redirect: http://localhost:4000/v1/watch/anilist/callback)
# MAL_CLIENT_ID / MAL_CLIENT_SECRET / MAL_REDIRECT_URI
# SHIKIMORI_CLIENT_ID / SHIKIMORI_CLIENT_SECRET / SHIKIMORI_REDIRECT_URI
# BANGUMI_CLIENT_ID / BANGUMI_CLIENT_SECRET / BANGUMI_REDIRECT_URI
# (default redirects: http://localhost:4000/v1/watch/{mal,shikimori,bangumi}/callback)
```

Without the MyAnimeList, Shikimori or Bangumi variables, connecting that provider returns `*_CLIENT_ID/SECRET not configured`. Set each `*_REDIRECT_URI` to your public API origin and register the same URL with the provider.

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

The web handlers forward to `NEXT_PUBLIC_API_URL` from inside the web container. The default `http://localhost:4000` points at the web container itself, so use the API host as `baseUrl` unless that URL is reachable from the container.

FE handlers (no catch-all rewrite):

- `GET /api/health` → `{ ok: true, service: "fe" }`
- `POST /api/oauth/qmonitor/token` → Nest
- `POST /api/oauth/qmonitor/revoke` → Nest
- `POST /api/webhooks/qmonitor` → Nest

BE also exposes `GET /api/health` → `{ ok: true, service: "be", webOrigin }`.

Auth is **not** OIDC discovery: auth-code + PKCE, device-bound refresh tokens (anti-exfil), short-lived access tokens checked against revoked device sessions on webhook ingest.

By default the API schedules Trakt, AniList, MAL, Kitsu, Bangumi, Shikimori, and Letterboxd scrape sync every 6 hours (`CRON_WATCH_SCHEDULE`; disable with `CRON_ENABLED=false`).

**Letterboxd scrape (optional):** admins define CSS selectors and URL macros under **Admin → Scrapers**. Users connect a Letterboxd username in **Watch → Sources**. Scraped entries share dedupe keys with CSV imports. The default Letterboxd config uses the `cheerio` engine, which needs no browser. The `playwright` engine only works when the API runs from source, after `pnpm --filter @questorylabs/api exec playwright install chromium`; the API image is Alpine-based and ships no browser.

### Frontend menus

Watch nav appears from the on-load `GET /v1/status` snapshot (`watch.enabled`). Reload after Admin changes. `GET /health` is not used for this.

### Optional: Read (manga / print)

Questory Read is an **API module** under `/v1/read/*`. It syncs manga/manhwa/novels from AniList, MyAnimeList, Kitsu, Bangumi, and Shikimori into dedicated Read tables (not Watch `Title` / `WatchEvent`).

```env
NEXT_PUBLIC_ENABLE_READ=true
# FEATURE_READ=true  # API outside Compose: wins over NEXT_PUBLIC_ENABLE_READ
# AniList / MAL / Shikimori / Bangumi OAuth — see Watch section
# Kitsu: connect in Read → Sources (email + password; tokens only stored)
```

Read nav appears from the on-load `GET /v1/status` snapshot (`read.enabled`). Reload after Admin changes. Connect AniList under **Read → Sources** (or Watch → Sources — shared connection), then sync. Cron AniList sync also refreshes manga.

## Steam OpenID URLs

- `STEAM_REALM` and `STEAM_RETURN_URL` must use the **API** origin.
- `STEAM_REALM` must be a prefix of `STEAM_RETURN_URL`.
- Example: realm `https://api.example.com`, return `https://api.example.com/auth/steam/callback`.
- `WEB_ORIGIN` is the browser app origin (CORS + post-login redirect).
- `FE_CORS_ALLOWED` is an optional comma-separated list of extra browser origins allowed for CORS and auth origin checks. `WEB_ORIGIN` is always included.
- `NEXT_PUBLIC_API_URL` (and related `NEXT_PUBLIC_*` / `ENTERPRISE`) are applied at **web container start** via `/runtime-env.js` — set them in compose `environment` (no rebuild required for Hub images).

## Auth (email + password)

Sign-up and sign-in use **email + password only**. Steam OpenID is link-only from **Connections** (requires an existing session).

- `ADMIN_EMAILS` — comma-separated emails granted `isAdmin` on register/login (also checked at request time). The first user is **not** admin unless listed here.
- Signup is always open while `count(isAdmin)=0`. After that, admins toggle signup in **Admin → Settings** (`AppConfig.signupEnabled`).
- Abuse protection: signed challenges, honeypots, min form-fill time, IP/email rate limits, login lockout, Origin checks. Prefer Redis (`REDIS_URL`) for multi-instance rate limits.
- `TRUST_PROXY=true` when behind a reverse proxy so client IP / rate limits use `X-Forwarded-For`. Without it, all users share the proxy's IP for rate limiting. Only enable it when the API is reachable solely through a proxy that sets the header itself: the first `X-Forwarded-For` value is trusted, so direct clients could spoof it.
- `TRUST_CLOUDFLARE=true` when Cloudflare proxies the API, so client IP / rate limits use `CF-Connecting-IP`. It takes priority over `TRUST_PROXY`. Only enable it once the origin accepts traffic solely from Cloudflare, because anyone reaching the origin directly can set this header.
- `AUTH_BLOCKED_EMAIL_DOMAINS` — extra disposable domains to reject on signup.
- `AUTH_MIN_FILL_MS` — minimum form-fill time (default `2000`). `AUTH_ALLOW_EMAIL_PLUS=false` rejects `+` addressing (allowed by default). `AUTH_CHALLENGE_SECRET` signs challenges (default: `SESSION_SECRET`).

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

`.env` for the same-origin setup:

```env
WEB_ORIGIN=https://games.example.com
NEXT_PUBLIC_API_URL=https://games.example.com/api
STEAM_REALM=https://games.example.com
STEAM_RETURN_URL=https://games.example.com/auth/steam/callback
TRUST_PROXY=true
```

Example Caddy sketch (same host, path split). Run Caddy on the Compose network, or point `reverse_proxy` at published ports:

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
  handle /apis/* {
    reverse_proxy api:4000
  }
  handle /webhooks/* {
    reverse_proxy api:4000
  }
  handle /api/health {
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

Browser path `/api/v1/library` becomes Nest `/v1/library` after `strip_prefix /api`. Steam auth and health stay unversioned at the API root; resource APIs live under `/v1`. ListenBrainz ingest stays at `/1/*` and `/apis/listenbrainz/1/*`; watch webhooks at `/webhooks/*`. `/api/health` stays unstripped because qMonitor expects the `service: "be"` response there. `api` resolves to the API service in every profile.

See also [testing.md](./testing.md) for the security test suite.

## QEngine security

- The browser should **not** call QEngine for product features. All recommendations, dossier, settings, guardrails, and telemetry admin routes go through the Nest API (`/v1/recommendations`, `/v1/enterprise/*`), which validates the session and proxies with a short-lived internal bearer token.
- Direct browser access to QEngine is limited to **`GET /health`** (ops probe). Feature gating uses **`GET /v1/enterprise/status`** on the API (public proxy).
- Set **`ENTERPRISE_INTERNAL_SECRET`** to the same long random value in the API and QEngine containers. QEngine rejects browser session cookies on protected routes.
- QEngine's source is private. Its image, `santoshpanna/questorylabs-qengine`, is published binary-only under a personal / noncommercial license; `docker-compose.enterprise.yml` pulls it (override with `QENGINE_IMAGE`).
- Keep QEngine on the **internal Docker network** (`ENTERPRISE_URL=http://enterprise:4030` from the API). Do not publish OTEL ports `:4040` / `:4318` to the host — they bind localhost inside the QEngine process only.

## Backups

Keep a copy of `.env` too: Last.fm credentials can't be decrypted without the same `MUSIC_CREDS_KEY` / `SESSION_SECRET`. Compose prefixes volume names with the project (for example `questory_sqlite_data`); list them with `docker volume ls`.

**Lite (SQLite):** the database is `/data/questorylabs.db` in the `sqlite_data` volume. All modules share this file. Stop the API so the copy is consistent:

```bash
docker compose --profile selfhosted stop api-lite
docker compose --profile selfhosted cp api-lite:/data/questorylabs.db ./questorylabs-backup.db
docker compose --profile selfhosted start api-lite
```

To restore, stop `api-lite`, copy the file back with `cp` in the other direction, and start it again.

**Full / production (Postgres):** all modules live in the `questorylabs` database in the `postgres_data` volume.

```bash
docker compose --profile selfhosted-full exec -T postgres pg_dump --clean --if-exists -U questorylabs questorylabs > questorylabs-backup.sql
```

To restore, stop `api` and `scrobbler`, then run `docker compose --profile selfhosted-full exec -T postgres psql -U questorylabs questorylabs < questorylabs-backup.sql`. `--clean --if-exists` makes the dump drop existing tables first.

Redis holds cache, locks, and in-flight jobs — back it up only if you care about queue state. Generated profile exports live in `/data/profile-exports` (the `sqlite_data` volume on lite, `profile_exports` on full).

## Daily sync cron

Cron runs **in-process** inside the API by default (opt out with `CRON_ENABLED=false`). It schedules the same work as the internal cron HTTP routes:

| Job | Default (container time, UTC unless the image's timezone is overridden) | Schedule variable | What it does |
|-----|--------------------------------------------------|-------------------|--------------|
| `daily-refresh` | `0 3 * * *` | `CRON_DAILY_SCHEDULE` | Enqueue `library-sync` for every Steam-linked user (owned games + friends) |
| `recover-failed-sync` | `*/15 * * * *` | `CRON_RECOVERY_SCHEDULE` | Clear stuck `SyncJob` rows and catalog lock/failed state |
| `watch-sync` | `0 */6 * * *` | `CRON_WATCH_SCHEDULE` | Sync connected Watch providers (when in use) |
| `catalog-sync` | `0 4 * * *` | `CRON_CATALOG_SCHEDULE` | Refresh the game catalog |
| `price-sync` | `0 5 * * *` | `CRON_PRICE_SCHEDULE` | Enqueue `metadata-refresh` for every Steam-linked user (prices for owned + friend-cached games) |
| `ai-goals` | `30 6 * * *` | `CRON_AI_GOALS_SCHEDULE` | Generate AI goals (QEngine) |
| `monthly-recap` | `0 6 1 * *` | `CRON_RECAP_SCHEDULE` | Generate monthly recaps |

Scheduled ticks and admin/HTTP triggers write `CronRun` rows (`triggeredBy`: `system` | `admin` | `cron`) visible under `/admin/cron`.

```env
# Default: on. Disable in-process scheduling (e.g. external-only HTTP cron):
# CRON_ENABLED=false
CRON_SECRET=a-long-random-shared-secret
```

`CRON_SECRET` is required only for `POST /v1/internal/cron/{daily-refresh,recover-failed-sync,catalog-sync,price-sync,ai-goals}` and `POST /v1/watch/internal/cron/{trakt-sync,anilist-sync,mal-sync,kitsu-sync,bangumi-sync,shikimori-sync,letterboxd-scrape}` (Bearer / `x-cron-secret`). If it is unset those routes return 401. Admin triggers use the admin session; in-process ticks do not need the secret. The full, production and enterprise templates ship a placeholder value that is a working secret, so replace it.

## Secrets checklist

- `SESSION_SECRET` — `openssl rand -hex 32`. The API rejects empty, short and `change-me*` values in non-local modes, but not the `replace-with-a-long-random-string` template value. Rotating it signs everyone out and makes Last.fm credentials unreadable unless `MUSIC_CREDS_KEY` is set
- `STEAM_API_KEY` — [Steam Web API key](https://steamcommunity.com/dev/apikey)
- `CRON_SECRET` — required for `/v1/internal/cron/*` HTTP callers (optional if you only use in-process cron). Replace the template placeholder, or remove it if you don't use HTTP cron
- Music ingest / watch webhook tokens — mint per-user ApiKeys in Settings (not env vars)
- `TRAKT_CLIENT_ID` / `TRAKT_CLIENT_SECRET` — required for Trakt OAuth (watch module)
- `TMDB_API_KEY` — required for watch metadata enrichment (keep TMDB attribution in the UI)
- `ENTERPRISE_INTERNAL_SECRET` — enterprise stack only; its compose default is `change-me-in-production`
- Change the default Postgres password and stop publishing `5432` / `6379` on any internet-facing host ([how](#lock-down-postgres-redis-and-the-password))
- Never commit `.env`

## Schema deploy note

Canonical schema: `packages/db/prisma/schema.template.prisma`. Use `pnpm db:generate` / `pnpm db:push` from the repo root; note that `pnpm db:push` passes `--accept-data-loss`, so back up first. Containers run `prisma db push` on start against that shared schema, without that flag: if a schema change would lose data, the API refuses to start and logs why. Back up before every update, and don't roll back to an older image after a schema change without restoring the matching backup.
