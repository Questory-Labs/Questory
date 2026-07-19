# Private extensions

Maintainer-only mount point for a nested private git repository.

The parent repo tracks **only this file**. Everything else under this directory is gitignored and must not be published with the community tree.

```bash
cd enterprise
git init
git remote add origin <private-remote-url>
```

Build from the monorepo root after cloning private sources: `pnpm --filter questorylabs-private build`.
Do not commit parent `pnpm-lock.yaml` diffs that add an `enterprise` importer.
