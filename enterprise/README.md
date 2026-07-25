# Private enterprise service

Maintainer-only mount point for a nested private git repository: a single Rust
Axum service (`questorylabs-enterprise`) with recommendations, dossier/settings,
soft-gate status, and an in-process OTLP collector.

Recommendations / Telemetry **UI** ships in the community web app
(`apps/web/src/components/enterprise`) and is status-gated — it does not live here.

The parent repo tracks **only this file**. Everything else under this directory
is gitignored and must not be published with the community tree.

```bash
cd enterprise
git init
git remote add origin <private-remote-url>
```

## Run

```bash
# From enterprise/ (reads .env then ../.env for DATABASE_URL / SESSION_SECRET)
cargo run

# Or Docker
docker compose -f docker-compose.enterprise.yml up -d --build
```

Point the community web at the service:

```bash
# repo-root .env
ENTERPRISE=true
NEXT_PUBLIC_ENTERPRISE_URL=http://localhost:4030
SESSION_SECRET=<same as API>
```

Soft gate: `ENTERPRISE=true` **and** `GET /v1/enterprise/status` on `:4030`.
See [docs/enterprise.md](docs/enterprise.md).
