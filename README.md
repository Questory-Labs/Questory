<div align="center">
  <a href="https://github.com/Questory-Labs/Questory">
    <img src="apps/web/public/favicon.svg" alt="Questory Logo" width="120" />
  </a>
  
  <h1 align="center">Questory</h1>
  <h6 align="center">
    — by QuestoryLabs
  </h6>
  
  
  <p align="center">
    <strong>Steam-first library and media intelligence.</strong><br/>
    Games dashboard, wishlist and cost analytics, friends and multiplayer planning.<br/>
    Plus optional music, movies/TV, and manga/reading modules.
  </p>

  

  <p align="center">
    <a href="https://questory-labs.github.io/"><img alt="Website & Docs" src="https://img.shields.io/badge/Docs-questory--labs.github.io-blue?style=for-the-badge&logo=github" /></a>
    <a href="https://hub.docker.com/r/santoshpanna/questorylabs-api/stable"><img alt="API Docker" src="https://img.shields.io/docker/v/santoshpanna/questorylabs-api/stable?label=API%20Image&style=for-the-badge&logo=docker&logoColor=white" /></a>
    <a href="https://hub.docker.com/r/santoshpanna/questorylabs-web/stable"><img alt="Web Docker" src="https://img.shields.io/docker/v/santoshpanna/questorylabs-web/stable?label=Web%20Image&style=for-the-badge&logo=docker&logoColor=white" /></a>
    <a href="https://hub.docker.com/r/santoshpanna/questorylabs-qengine"><img alt="QEngine Docker" src="https://img.shields.io/docker/v/santoshpanna/questorylabs-qengine?label=QEngine%20Image&style=for-the-badge&logo=docker&logoColor=white" /></a>
    <a href="https://www.npmjs.com/package/@questorylabs/qhttp"><img alt="NPM qHttp" src="https://img.shields.io/npm/v/@questorylabs/qhttp?style=for-the-badge&logo=npm&label=qHttp%20Library" /></a>
  </p>

  <p align="center">
    <a href="https://nextjs.org/"><img alt="Next.js" src="https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js" /></a>
    <a href="https://nestjs.com/"><img alt="NestJS" src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" /></a>
    <a href="https://www.prisma.io/"><img alt="Prisma" src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" /></a>
    <a href="https://tailwindcss.com/"><img alt="Tailwind CSS 4" src="https://img.shields.io/badge/Tailwind_CSS%204-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" /></a>
    <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/License-PolyForm_Noncommercial-0052CC?style=for-the-badge" /></a>
  </p>
</div>

<br/>

## ✨ Features

- 🎮 **Steam Intelligence**: Comprehensive library insights, cost analytics, and dynamic wishlists.
- 👥 **Multiplayer Planning**: See what friends are playing and organize gaming sessions seamlessly.
- 🎧 **Music & Media (Optional)**: Ingest and analyze music via ListenBrainz, movies/TV via Trakt/TMDB, and reading via AniList.
- ⚡ **Modern Stack**: Built for speed and scale with Next.js 16 App Router, NestJS, and Prisma.
- 🛠️ **Flexible Deployment**: Run locally with SQLite or scale up with Postgres + Redis via Docker Compose.

---

## 🏗️ Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Web** | Next.js 16, Tailwind CSS 4, Recharts, Framer Motion |
| **API** | NestJS, Prisma, BullMQ (with Redis); optional in-process cron |
| **Music** | ListenBrainz ingest + analytics (`/v1/music/*`); shared DB (via [multi-scrobbler](https://github.com/foxxmd/multi-scrobbler)) |
| **Watch** | Movie/TV ingest + analytics (`/v1/watch/*`, `/webhooks/*`); shared DB |
| **Read** | Manga/novel ingest + analytics (`/v1/read/*`); shared DB |
| **Data** | SQLite **or** PostgreSQL (Environment selected) |
| **Cache/Queues** | In-memory **or** Redis (Environment selected) |

> 💡 **Tip:** Music, Watch, and Read features are soft-gated and optional in the UI.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [pnpm 10+](https://pnpm.io/)
- [Steam Web API key](https://steamcommunity.com/dev/apikey)
- Docker (for self-hosted or production stacks)

### Deployment Modes

Choose the setup that best fits your needs:

| Mode | Command | Database | Redis | Typical Use |
| :--- | :--- | :--- | :--- | :--- |
| **Local** | `pnpm setup` → `pnpm dev` | SQLite | Off | Development |
| **Self-hosted (lite)** | `pnpm docker:selfhosted` | SQLite volume | Off | Minimal home server |
| **Self-hosted (full)** | `pnpm docker:selfhosted-full` | Postgres | On | Durable self-host |
| **Production** | `pnpm docker:prod` | Postgres | On | Public HTTPS / multi-user |

---

## 💻 Environment Configurations

Copy the relevant environment template and edit your secrets:

```bash
cp .env.local.example .env
# Set SESSION_SECRET and STEAM_API_KEY
# Optional: ALLOWED_STEAM_IDS=76561198...,76561198...
```

> **Note:** `APP_MODE` drives boot checks (`local` \| `selfhosted` \| `selfhosted-full` \| `production`).  
> See [docs/self-hosting.md](docs/self-hosting.md) for detailed configuration options.

### 1. Local Development

```bash
cp .env.local.example .env
# Set STEAM_API_KEY (SESSION_SECRET can stay weak locally)

pnpm setup
pnpm dev
```
- **Web**: [http://localhost:3000](http://localhost:3000)
- **API**: [http://localhost:4000](http://localhost:4000) — *Handles Steam, optional media modules, and in-process cron.*
- *Optional Features:* Set `NEXT_PUBLIC_ENABLE_MUSIC=true`, `NEXT_PUBLIC_ENABLE_WATCH=true`, or `NEXT_PUBLIC_ENABLE_READ=true` in your environment (nav links appear when the API `/health` endpoint reports them as enabled).

*Want Docker-based infra during local dev?* Run `pnpm docker:infra` to spin up Postgres and Redis, then update `DATABASE_URL` and `REDIS_URL` to point to localhost.

### 2. Self-Hosted (Lite & Full)

For self-hosting setups, copy the respective `.env` template and set your `SESSION_SECRET`, `STEAM_API_KEY`, and optionally `ALLOWED_STEAM_IDS`.

```bash
# Lite setup (SQLite)
pnpm docker:selfhosted

# Full setup (Postgres + Redis)
pnpm docker:selfhosted-full  # (Alias: pnpm docker:up)
```
> **Pro-Tip:** Prefer building from source using `-- --build`. Compose may pull prebuilt images when configured.

### 3. Production (Public HTTPS)

```bash
cp .env.production.example .env
# Set strong SESSION_SECRET, STEAM_API_KEY
# Set public HTTPS for STEAM_*, WEB_ORIGIN, and NEXT_PUBLIC_API_URL
# Set ADMIN_EMAILS=you@example.com for the first admin
pnpm docker:prod
```

> ⚠️ **Warning:** Production boots will fail if secrets are placeholders or URLs remain as localhost. Signups remain open until at least one admin exists, after which it can be toggled in Admin settings.

---

## ⚙️ Environment Variables Overview

<details>
<summary><strong>Click to view all core environment variables</strong></summary>

| Variable | Purpose |
| :--- | :--- |
| `APP_MODE` | `local`, `selfhosted`, `selfhosted-full`, or `production` |
| `DATABASE_PROVIDER` | `sqlite` or `postgresql` |
| `DATABASE_URL` | Connection string for DB (`file:...` or `postgresql://...`) |
| `REDIS_URL` | Cache/BullMQ. Leave empty for in-memory sync. |
| `USE_INLINE_SYNC` | Set to `true` to force inline sync even when Redis is set. |
| `SESSION_SECRET` | Cookie signing secret |
| `STEAM_API_KEY` | Mandatory API Key from Steam |
| `STEAM_REALM` / `RETURN_URL`| OpenID configuration (Must match API origin) |
| `WEB_ORIGIN` | Browser app origin (for CORS + redirects) |
| `NEXT_PUBLIC_API_URL` | Web client's connection point to the API |
| `ALLOWED_STEAM_IDS` | Comma-separated allowlist of Steam IDs for auth (empty = any) |
| `ADMIN_EMAILS` | Emails granted admin status upon signup/login |
| `CRON_ENABLED` | Toggle internal cron jobs (`true` / `false` / `0`) |

*Prisma cannot take `provider` from env at runtime, so `pnpm db:schema` generates `schema.prisma` from `schema.template.prisma` before dev/build hooks.*

</details>

---

## 🛠️ Scripts & Tooling

| Command | Description |
| :--- | :--- |
| `pnpm setup` | Install, build shared packages, generate Prisma provider, push schema |
| `pnpm dev` | Start Web + API servers |
| `pnpm test` | Run Vitest across packages that define tests |
| `pnpm db:schema` | Generate `schema.prisma` for the active DB provider |
| `pnpm db:push` | Apply Prisma schema changes to the DB |
| `pnpm docker:*` | Compose aliases (`up`, `down`, `build`, `selfhosted`, `prod`, etc.) |

*CI runs automatically on pull requests to `main` (Vitest and Playwright for web).*

---

## 📂 Monorepo Structure

```text
apps/web                 Next.js 16 App Router UI
apps/api                 NestJS API (Steam + music + watch + in-process cron)
packages/db              Shared Prisma schema template + client
packages/shared          Shared Zod schemas, session/oauth helpers
docs/                    Documentation (self-hosting, testing)
docker-compose.yml       Compose deployment profiles
```

---

## 🔒 Privacy Notes

- Friends lists, wishlists, and robust library parsing require public Steam privacy settings.
- Sync jobs are designed to degrade gracefully if user data is kept private.

---

## 📝 License

This project is source-available and distributed under the **PolyForm Noncommercial 1.0.0** License.
See [LICENSE](LICENSE) for details.

- **Noncommercial Use**: Personal and noncommercial self-hosting is allowed.
- **Commercial Use**: Not granted by this license — contact the copyright holder.
- **Required Notice**: Copyright Questory Labs (https://github.com/Questory-Labs/Questory)

*Never relicense as MIT/Apache, strip notices, or imply commercial rights under this license.*