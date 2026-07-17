# Questory Labs

Analytics and library intelligence for Steam — dashboard, wishlist intel, cost analytics, friend comparison, multiplayer planning, family insights, and smart collections.

## Stack

- **Web**: Next.js 15, Tailwind CSS 4, TanStack Query, Recharts, Framer Motion
- **API**: NestJS, Prisma, BullMQ (when Redis is configured)
- **Data**: SQLite **or** PostgreSQL (env-selected)
- **Cache / queues**: in-memory **or** Redis (env-selected)
- **Deploy**: Docker Compose profiles (lite / full / production)

## Prerequisites

- Node.js 20+
- pnpm 10+
- [Steam Web API key](https://steamcommunity.com/dev/apikey)
- Docker (for self-hosted / production stacks)

## Choose your setup

| Mode | Command | Database | Redis | Typical use |
|------|---------|----------|-------|-------------|
| **Local** | `pnpm setup` → `pnpm dev` | SQLite | Off | Development |
| **Self-hosted (lite)** | `pnpm docker:selfhosted` | SQLite volume | Off | Minimal home server |
| **Self-hosted (full)** | `pnpm docker:selfhosted-full` | Postgres | On | Durable self-host |
| **Production** | `pnpm docker:prod` | Postgres | On | Cloud / multi-user |

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

- Web: http://localhost:3000  
- API: http://localhost:4000  

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

Compose uses Docker Hub images (`santoshpanna/questorylabs-api`, `santoshpanna/questorylabs-web`, `santoshpanna/questorylabs-cron`) when present; add `-- --build` to build from source instead.

### 4. Production (cloud / multi-user)

```bash
cp .env.production.example .env
# set strong SESSION_SECRET, STEAM_API_KEY
# set public HTTPS STEAM_*, WEB_ORIGIN, NEXT_PUBLIC_API_URL
# leave ALLOWED_STEAM_IDS empty for open signup

pnpm docker:prod
```

Production boot fails if secrets are placeholders or Steam/Web URLs are still localhost.

## Environment overview

| Variable | Purpose |
|----------|---------|
| `APP_MODE` | `local` \| `selfhosted` \| `selfhosted-full` \| `production` |
| `DATABASE_PROVIDER` | `sqlite` or `postgresql` (optional if `DATABASE_URL` is clear) |
| `DATABASE_URL` | `file:…` or `postgresql://…` |
| `REDIS_URL` | Set for Redis cache + BullMQ; empty = in-memory + inline sync |
| `USE_INLINE_SYNC` | `true` forces inline sync even when Redis is set |
| `SESSION_SECRET` | Cookie signing secret |
| `STEAM_API_KEY` | Steam Web API |
| `STEAM_REALM` / `STEAM_RETURN_URL` | OpenID on the **API** origin |
| `WEB_ORIGIN` | Browser app origin (CORS + redirect) |
| `NEXT_PUBLIC_API_URL` | API URL baked into the web client |
| `COOKIE_DOMAIN` | Optional shared cookie domain (prod split hosts) |
| `ALLOWED_STEAM_IDS` | Optional comma-separated SteamIDs; empty = open signup |
| `CRON_ENABLED` | `true` / `TRUE` / `1` to run the cron scheduler; otherwise off |
| `CRON_SECRET` | Shared secret for `/internal/cron/*` (API + cron service) |
| `API_INTERNAL_URL` | Base URL the cron service uses to reach the API |
| `CRON_DAILY_SCHEDULE` | Cron expr for daily price/stats refresh (default `0 3 * * *`) |
| `CRON_RECOVERY_SCHEDULE` | Cron expr for stuck-sync recovery (default `*/15 * * * *`) |

Prisma cannot take `provider` from env at runtime, so `pnpm db:schema` (and pre-dev/pre-build hooks) generate `schema.prisma` from `schema.template.prisma`.

`GET /health` reports mode, database provider, Redis/sync mode, and whether the allowlist is enabled.

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

| Command | Description |
|---------|-------------|
| `pnpm setup` | Install, build shared, sync Prisma provider, push schema |
| `pnpm dev` | Run API + web |
| `pnpm dev:cron` | Run daily sync scheduler (requires `CRON_ENABLED` + `CRON_SECRET`) |
| `pnpm db:schema` | Generate `schema.prisma` for the active provider |
| `pnpm db:push` | Apply schema to the configured database |
| `pnpm docker:infra` | Start Postgres + Redis only |
| `pnpm docker:selfhosted` | Lite stack (SQLite) |
| `pnpm docker:selfhosted-full` | Full stack (Postgres + Redis) |
| `pnpm docker:prod` | Production profile stack |
| `pnpm docker:up` | Alias for `docker:selfhosted-full` |
| `pnpm docker:down` | Stop Compose services |
| `pnpm docker:publish` | Build + push `santoshpanna/questorylabs-{api,web,cron}` to Docker Hub |
| `pnpm docker:build` | Build those images locally without pushing |

### Releases (GitHub Actions)

| Tag | Action |
|-----|--------|
| `docker-api-1.0.0` (also `web` / `cron`) | Test (if present) → build & push Docker image |
| `service-api-1.0.0` | Release/deploy using that Hub image (no rebuild) |

CI on `main` runs each service’s tests when a `test` script exists. Details: [docs/self-hosting.md](docs/self-hosting.md).

## Monorepo

```
apps/web                 Next.js app
apps/api                 NestJS API + Prisma
apps/cron                Daily sync scheduler (calls API internal endpoints)
apps/api/prisma/schema.template.prisma
packages/shared          Shared Zod types
docker-compose.yml       Compose profiles for deploy
docs/self-hosting.md     Self-host / reverse proxy / backups
```

## Privacy notes

Friends list, wishlist, and some libraries require public Steam privacy settings. Sync jobs degrade gracefully when data is private.
