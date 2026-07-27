# Agent instructions — Questory

Canonical guidance for AI coding agents. Tool-specific entrypoints (`GEMINI.md`, `CLAUDE.md`, `.cursor/rules/`) only point here.

## Product

Questory is source-available, Steam-first library and media intelligence: games dashboard, wishlist and cost analytics, friends and multiplayer planning, family insights, and smart collections — plus optional **Music**, **Watch**, and **Read**.

Optional **Music** (ListenBrainz ingest via multi-scrobbler), **Watch** (Trakt/TMDB/AniList anime/Letterboxd/webhooks), and **Read** (AniList manga/manhwa/novels) live inside the API process (same DB and `User` model). Soft-gated in the UI via feature flags.

Human docs: [README.md](README.md), [docs/self-hosting.md](docs/self-hosting.md), [docs/testing.md](docs/testing.md).

## License

SPDX: `PolyForm-Noncommercial-1.0.0` — see [LICENSE](LICENSE).

- Source-available; **not** OSI-approved open source.
- Personal / noncommercial self-hosting is allowed.
- Commercial use is **not** granted by this license — contact the copyright holder.
- On redistribute, keep the license terms (or PolyForm URL) and any `Required Notice:` lines.

Required Notice: Copyright Questory Labs (https://github.com/Questory-Labs/Questory)

Never relicense as MIT/Apache, strip notices, or imply commercial rights under this license.

## Monorepo

| Path | Role |
|------|------|
| `apps/api` | NestJS API (Steam + music + watch + in-process cron) |
| `apps/web` | Next.js 15 App Router UI |
| `packages/shared` | Zod schemas, session/oauth helpers (`@questorylabs/shared`) |
| `packages/db` | Shared Prisma schema template + client (`@questorylabs/db`) |
| `docs/` | Self-hosting, testing |
| `enterprise/` | Private QEngine (Rust Axum) mount; only `enterprise/README.md` is tracked |

Prisma: edit `packages/db/prisma/schema.template.prisma`. Generated `schema.prisma` / client are produced by `pnpm db:schema` / `db:generate` — do not fork per-app schemas.

## Tooling

- Node `>=20`, package manager **pnpm** (`packageManager` in root `package.json`)
- Local ports: web `3000`, API `4000` (QEngine `:4030`, in-process OTLP `:4318` / query `:4040`)

| Command | Purpose |
|---------|---------|
| `pnpm setup` | Install, build shared/db, generate + push Prisma |
| `pnpm dev` | API + web |
| `pnpm db:schema` / `db:generate` / `db:push` / `db:migrate` | Prisma lifecycle |
| `pnpm test` | Vitest across packages that define `test` |
| `pnpm docker:selfhosted` / `selfhosted-full` / `prod` | Compose profiles |

Use `pnpm --filter @questorylabs/<pkg> …` for package-scoped work.

Music/Watch/Read UI: `NEXT_PUBLIC_ENABLE_MUSIC` / `NEXT_PUBLIC_ENABLE_WATCH` / `NEXT_PUBLIC_ENABLE_READ` plus API `/health` reporting `music`/`watch`/`read` enabled.

QEngine: opt-in via `ENTERPRISE=true` (web exposes the flag through `next.config` and soft-gates on `GET /v1/enterprise/status` at `NEXT_PUBLIC_ENTERPRISE_URL`). Private mount is Rust-only (`cargo run` under `enterprise/`). Without the flag or a reachable service, Recommendations/Telemetry stay hidden.

## Code conventions

- Prefer types and Zod schemas from `@questorylabs/shared`; validate with `safeParse` in Nest controllers.
- Nest: feature `*.module.ts` / `*.controller.ts` / `*.service.ts`; match existing guards/decorators.
- API resource routes under `/v1`. Unversioned by design: `/auth/*`, `/health`. Music ListenBrainz stays at `/1/*`; watch webhooks at `/webhooks/*`. Music/watch/read session APIs: `/v1/music/*`, `/v1/watch/*`, `/v1/read/*`.
- Web: App Router under `apps/web/src/app`; soft-gate `/music/*`, `/watch/*`, `/read/*`, and QEngine routes (`/recommendations`, `/admin/telemetry`) with existing gate hooks/components. QEngine also requires `ENTERPRISE=true`.
- Match nearby patterns. Do not invent eslint/prettier configs or lint scripts unless the repo already has them.
- Keep changes scoped; avoid drive-by refactors and unsolicited markdown docs.

## Secrets and git

Never commit `.env`, secrets, local DB files, generated Prisma artifacts, or `enterprise/*` sources (except the tracked README).

Copy from `.env.local.example`, `.env.selfhosted.example`, `.env.selfhosted-full.example`, or `.env.production.example`. Required secrets typically include `SESSION_SECRET` and `STEAM_API_KEY`.

Do not commit `pnpm-lock.yaml` diffs that add an `enterprise` importer.

## Testing

- Vitest: `*.spec.ts` per package; Nest tests usually mock Prisma/services.
- Web e2e: Playwright (`pnpm --filter @questorylabs/web test:e2e`).
- Follow [docs/testing.md](docs/testing.md).

## Boundaries

**Always**

- Respect PolyForm Noncommercial + Required Notice.
- Use pnpm workspace filters; run `pnpm setup` (or `db:generate`) before Nest/Prisma work when schema/client is stale.
- Keep one shared DB schema in `packages/db`.

**Ask first**

- Changing [LICENSE](LICENSE) or license wording in docs.
- Commercial-license framing or Hub image publish/release flows.

**Never**

- Commit secrets or treat the project as MIT/Apache.
- Publish or commit private `enterprise/` sources (QEngine Rust service, private docs/compose). Community Recommendations/Telemetry UI under `apps/web` is allowed and expected.
- Invent parallel Prisma schemas per app.