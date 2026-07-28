# QEngine

Maintainer-only mount point for a nested private git repository: a single Rust
Axum service (`qengine`) with recommendations, dossier/settings,
soft-gate status, and an in-process OTLP collector.

Recommendations / Telemetry **UI** ships in the community web app
(`apps/web/src/components/enterprise`) and is status-gated — it does not live here.

The parent repo tracks **only this file**. Everything else under this directory
is gitignored and must not be published with the community tree.

## License

QEngine is **closed source**. Official **Docker images are binary-only** and are licensed for **personal and noncommercial**
use. Commercial use requires a separate license from Questory Labs.

## Docker (recommended)

Prebuilt image (personal / noncommercial):

```bash
docker pull santoshpanna/questorylabs-qengine:latest
# or: docker pull ghcr.io/questory-labs/questorylabs-qengine:latest
```

Run alongside the community stack:

```bash
# repo-root .env
ENTERPRISE=true
NEXT_PUBLIC_ENTERPRISE_URL=http://localhost:4030
SESSION_SECRET=<same as API>

export QENGINE_IMAGE=santoshpanna/questorylabs-qengine:latest
docker compose -f docker-compose.enterprise.yml up -d
```

## Run from source (maintainers)

```bash
# From enterprise/ (reads .env then ../.env for DATABASE_URL / SESSION_SECRET)
cargo run

# Or Docker build from private sources
docker compose -f docker-compose.enterprise.yml up -d --build
```

Soft gate: `ENTERPRISE=true` **and** `GET /v1/enterprise/status` on `:4030`.
See [docs/enterprise.md](docs/enterprise.md) (private tree).
