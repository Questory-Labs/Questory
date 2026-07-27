# Web UI style guide

Canonical visual language for `apps/web`. Tokens live in [`apps/web/src/app/globals.css`](../apps/web/src/app/globals.css). Shared primitives live in `apps/web/src/components/ui/`.

## Brand / direction

Dark warm paper with a mint accent and pencil hatch casts — library intelligence, not a neon dashboard.

- Prefer hatch faces + opaque panels over soft glow stacks.
- Avoid purple-on-indigo themes, cream/terracotta “AI brochure” looks, and broadsheet newspaper layouts.
- Store brand colors (`StoreBadge`) and chart series palettes are allowed exceptions; everything else uses CSS variables.

## Tokens

| Token | Role |
|-------|------|
| `--bg-0` … `--bg-3` | Page and elevated backgrounds |
| `--ink` | Primary text |
| `--muted` / `--faint` | Secondary / tertiary text |
| `--accent` / `--accent-dim` | Brand mint / wash |
| `--warm` | Sync / caution accent |
| `--danger` | Errors and destructive emphasis |
| `--line` / `--line-strong` | Borders |
| `--surface` / `--surface-2` / `--paper` | Panel fills |
| `--radius` | Default corner radius (`8px`) |
| `--shadow-offset*` | Hatch cast offsets |

Use `var(--…)` (or mapped Tailwind theme colors). Do not hardcode `#0b1218`, `#101012` for ink-on-accent (use `var(--bg-0)`), `text-red-400`, or off-palette washes like `rgba(26,40,54,…)`.

## Typography

Fonts (loaded in root layout): **Bricolage Grotesque** (display), **Figtree** (body), **IBM Plex Mono** (labels).

| Role | Pattern |
|------|---------|
| Page eyebrow | `font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]` |
| Page title | `font-display text-4xl tracking-tight sm:text-5xl` (use class `font-display`, not inline `fontFamily`) |
| Page blurb | `mt-3 text-[var(--muted)]` |
| Mono labels | `font-mono` + small uppercase tracking |

Use [`PageHeader`](../apps/web/src/components/ui/PageHeader.tsx) for authenticated pages.

## Layout

| Surface | Rule |
|---------|------|
| Landing `/` | No `AppShell`. Brand-first hero; ambient `LandingBackground`. |
| Authenticated | Wrap with `AppShell`. Content width comes from shell `main` (`max-w-6xl` + padding). |
| Nested pages | Do **not** add another `max-w-*` + `px-*` + `py-*` wrapper inside AppShell. |

## Components

### Panels

- **Elevated (default)** — `HatchShadow` + `.panel` via `<Panel>`. Same surface as `StatCard`; use for content cards and charts.
- **Outline** — `.panel-outline` or `<Panel elevated={false}>`. Use for dense lists, filters, and table shells.

### Buttons

| Variant | Class / component | Use |
|---------|-------------------|-----|
| Primary (in-app) | `.btn btn-primary` / `<Button variant="primary">` | Forms, create, save |
| Secondary | `.btn btn-secondary` / `<Button variant="secondary">` | Cancel, refresh, import |
| Ghost | `.btn btn-ghost` / `<Button variant="ghost">` | Inline text actions |
| Landing CTA | `HatchShadow` + accent fill + `text-[var(--bg-0)]` | Elevated sign-in only |

In-app primaries stay flat (`.btn-primary`) for density. Hatch-elevated primary is reserved for the landing CTA.

### Existing building blocks

- `StatCard` — compact hatch-elevated metric tiles (`.panel` face + `HatchShadow`); use everywhere KPIs appear
- `GameTile` / `GameShelf` — game posters
- `EmptyState` — centered empty copy in elevated panel
- `StateMessage` — loading (`muted`) or error (`--danger`)

## States

- **Loading** — `<StateMessage variant="loading">…</StateMessage>`
- **Error** — `<StateMessage variant="error">…</StateMessage>` with `text-[var(--danger)]` (never `text-red-400`)
- **Empty** — `<EmptyState title="…" description="…" />` when the page already uses hatch empties; otherwise a short muted paragraph is fine for dense tables

## Motion

Reserve enter motion for landing and the dashboard hero. Elsewhere prefer static layout; do not add decorative animation noise.

## Do / don’t

**Do**

- Use `PageHeader`, `Button`, `Panel`, `EmptyState`, `StateMessage`
- Apply display type with `font-display`
- Keep Music/Watch pages on the same header/panel language as Steam pages

**Don’t**

- Mix `font-[family-name:var(--font-display)]` or `style={{ fontFamily: "var(--font-display)" }}`
- Nest AppShell padding again on Music/Watch pages
- Use Tailwind `shadow-xl` for product cards (hatch cast is the shadow language)
- Invent one-off accent-on-dark hexes
