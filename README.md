# Questory

Steam-first library and media intelligence — games dashboard, wishlist and cost analytics, friends and multiplayer planning, plus optional music, movies/TV, and manga/reading.

## Stack

- **Web**: Next.js 15, Tailwind CSS 4, TanStack Query, Recharts, Framer Motion
- **API**: NestJS, Prisma, BullMQ (when Redis is configured); optional Music + Watch modules and in-process cron
- **Music** (optional): ListenBrainz ingest + analytics inside the API (`/v1/music/`*, `/1/`*); **shared DB**; collection via [multi-scrobbler](https://github.com/foxxmd/multi-scrobbler)
- **Watch** (optional): movie/TV ingest + analytics inside the API (`/v1/watch/`*, `/webhooks/`*); **shared DB**
- **Data**: SQLite **or** PostgreSQL (env-selected)
- **Cache / queues**: in-memory **or** Redis (env-selected)
- **Deploy**: Docker Compose profiles (lite / full / production)



## Prerequisites

- Node.js 20+
- pnpm 10+
- [Steam Web API key](https://steamcommunity.com/dev/apikey)
- Docker (for self-hosted / production stacks)



## Choose your setup


| Mode                   | Command                       | Database      | Redis | Typical use                        |
| ---------------------- | ----------------------------- | ------------- | ----- | ---------------------------------- |
| **Local**              | `pnpm setup` → `pnpm dev`     | SQLite        | Off   | Development                        |
| **Self-hosted (lite)** | `pnpm docker:selfhosted`      | SQLite volume | Off   | Minimal home server                |
| **Self-hosted (full)** | `pnpm docker:selfhosted-full` | Postgres      | On    | Durable self-host                  |
| **Production**         | `pnpm docker:prod`            | Postgres      | On    | Public HTTPS / multi-user instance |


Copy an env template, then edit secrets:

```bash
cp .env.local.example .env                 # or .env.selfhosted.example / .env.selfhosted-full.example / .env.production.example
# set SESSION_SECRET, STEAM_API_KEY
# optional: ALLOWED_STEAM_IDS=76561198...,76561198...
```

`APP_MODE` drives boot checks (`local` | `selfhosted` | `selfhosted-full` | `production`).  
Details: [docs/self-hosting.md](docs/self-hosting.md).

### 1. Local development

```bash
cp .env.local.example .env
# set STEAM_API_KEY (SESSION_SECRET can stay weak in local)

pnpm setup
pnpm dev
```

- Web: [http://localhost:3000](http://localhost:3000)  
- API: [http://localhost:4000](http://localhost:4000) — Steam, optional Music/Watch modules, optional in-process cron  
- Music menus: set `NEXT_PUBLIC_ENABLE_MUSIC=true` (nav when API `/health` reports `music.enabled`)  
- Watch menus: set `NEXT_PUBLIC_ENABLE_WATCH=true` (nav when API `/health` reports `watch.enabled`)

Optional: run Postgres/Redis in Docker while developing against Node locally:

```bash
pnpm docker:infra
# then point DATABASE_URL / REDIS_URL in .env at localhost
```



### 2. Self-hosted lite (SQLite)

```bash
cp .env.selfhosted.example .env
# set SESSION_SECRET + STEAM_API_KEY
# recommended: ALLOWED_STEAM_IDS=your_steam_id

pnpm docker:selfhosted
```



### 3. Self-hosted full (Postgres + Redis)

```bash
cp .env.selfhosted-full.example .env
# set SESSION_SECRET + STEAM_API_KEY
# recommended: ALLOWED_STEAM_IDS=...

pnpm docker:selfhosted-full
```

`pnpm docker:up` is an alias for `docker:selfhosted-full`.

Prefer building from source (`-- --build`). Compose may pull prebuilt images when configured.

### 4. Production (public HTTPS)

```bash
cp .env.production.example .env
# set strong SESSION_SECRET, STEAM_API_KEY
# set public HTTPS STEAM_*, WEB_ORIGIN, NEXT_PUBLIC_API_URL
# set ADMIN_EMAILS=you@example.com for the first admin
# signup opens until an admin exists, then toggle in Admin settings

pnpm docker:prod
```

Production boot fails if secrets are placeholders or Steam/Web URLs are still localhost.

## Environment overview


| Variable                           | Purpose                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `APP_MODE`                         | `local`                                                                                |
| `DATABASE_PROVIDER`                | `sqlite` or `postgresql` (optional if `DATABASE_URL` is clear)                         |
| `DATABASE_URL`                     | `file:…` or `postgresql://…`                                                           |
| `REDIS_URL`                        | Set for Redis cache + BullMQ; empty = in-memory + inline sync                          |
| `USE_INLINE_SYNC`                  | `true` forces inline sync even when Redis is set                                       |
| `SESSION_SECRET`                   | Cookie signing secret                                                                  |
| `ADMIN_EMAILS`                     | Emails granted admin on signup/login                                                   |
| `TRUST_PROXY`                      | Trust `X-Forwarded-For` for auth rate limits                                           |
| `STEAM_API_KEY`                    | Steam Web API                                                                          |
| `STEAM_REALM` / `STEAM_RETURN_URL` | OpenID on the **API** origin (link-only)                                               |
| `WEB_ORIGIN`                       | Browser app origin (CORS + redirect)                                                   |
| `NEXT_PUBLIC_API_URL`              | API URL baked into the web client                                                      |
| `NEXT_PUBLIC_ENABLE_MUSIC`         | Show Music UI when API `/health` reports music enabled                                 |
| `NEXT_PUBLIC_ENABLE_WATCH`         | Show Watch UI when API `/health` reports watch enabled                                 |
| `COOKIE_DOMAIN`                    | Optional shared cookie domain (prod split hosts)                                       |
| `ALLOWED_STEAM_IDS`                | Optional SteamIDs allowed to **link**; empty = any                                     |
| `CRON_ENABLED`                     | In-process cron inside the API (default on); set `false` / `FALSE` / `0` to disable    |
| `CRON_SECRET`                      | Shared secret for `/v1/internal/cron/*` (HTTP only; not required for in-process ticks) |
| `CRON_DAILY_SCHEDULE`              | Cron expr for daily price/stats refresh (default `0 3 * * *`)                          |
| `CRON_RECOVERY_SCHEDULE`           | Cron expr for stuck-sync recovery (default `*/15 * * * *`)                             |
| `CRON_WATCH_SCHEDULE`              | Cron expr for watch Trakt/AniList sync (default `0 */6 * * *`)                         |


Prisma cannot take `provider` from env at runtime, so `pnpm db:schema` (and pre-dev/pre-build hooks) generate `schema.prisma` from `schema.template.prisma`.

`GET /health` reports mode, database provider, Redis/sync mode, whether the allowlist is enabled, and `music` / `watch` enabled flags.

API resource routes are versioned under `/v1` (e.g. `/v1/library`). Unversioned: `/auth/*`, `/health`. Music ListenBrainz stays at `/1/*`; watch webhooks stay at `/webhooks/*`. Music/watch session APIs: `/v1/music/*`, `/v1/watch/*`.

### Steam OpenID (local)

```
STEAM_API_KEY=your_key
STEAM_REALM=http://localhost:4000
STEAM_RETURN_URL=http://localhost:4000/auth/steam/callback
WEB_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`STEAM_REALM` must be a prefix of `STEAM_RETURN_URL` (use the API origin).

## Scripts


| Command                       | Description                                              |
| ----------------------------- | -------------------------------------------------------- |
| `pnpm setup`                  | Install, build shared, sync Prisma provider, push schema |
| `pnpm dev`                    | Run API + web                                            |
| `pnpm db:schema`              | Generate `schema.prisma` for the active provider         |
| `pnpm db:push`                | Apply schema to the configured database                  |
| `pnpm docker:infra`           | Start Postgres + Redis only                              |
| `pnpm docker:selfhosted`      | Lite stack (SQLite)                                      |
| `pnpm docker:selfhosted-full` | Full stack (Postgres + Redis)                            |
| `pnpm docker:prod`            | Production profile stack                                 |
| `pnpm docker:up`              | Alias for `docker:selfhosted-full`                       |
| `pnpm docker:down`            | Stop Compose services                                    |
| `pnpm docker:build`           | Build API/web images locally                             |


CI on `main` runs Vitest (and Playwright for web) across packages with a `test` script. See [docs/testing.md](docs/testing.md).

## Monorepo

```
apps/web                 Next.js app
apps/api                 NestJS API + Prisma (music, watch, in-process cron)
packages/db              Shared Prisma schema + client
packages/shared          Shared Zod types
docker-compose.yml       Compose profiles for deploy
docs/self-hosting.md     Self-host / reverse proxy / backups
```



## Privacy notes

Friends list, wishlist, and some libraries require public Steam privacy settings. Sync jobs degrade gracefully when data is private.