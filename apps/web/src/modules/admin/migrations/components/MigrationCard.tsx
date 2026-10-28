"use client";

import { Button } from "@/components/ui";
import { statusTone } from "../../shared/admin.tone";
import { AdminStatusPill } from "../../shared/components/AdminStatusPill";
import type { MigrationItem } from "../admin.migrations.types";
import {
  migrationCardTone,
  migrationMeta,
  parseResult,
  statusLabel,
} from "../admin.migrations.utils";

export const MigrationCard = ({
  migration,
  busy,
  running,
  onRequest,
}: {
  migration: MigrationItem;
  busy: boolean;
  running: boolean;
  onRequest: (key: string) => void;
}) => {
  const result = parseResult(migration.lastResult);
  const actionLabel = migration.hasRun ? "Retry" : "Run";
  const live = migration.status === "running";

  return (
    <article className={`panel q-in space-y-3 p-5 ${migrationCardTone(migration.status)}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-mono text-sm text-[var(--ink)]">{migration.key}</h3>
          <p className="mt-1 text-sm text-[var(--ink)]">{migration.name}</p>
          <p className="mt-1 text-sm font-light text-[var(--muted)]">
            {migration.description}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <AdminStatusPill tone={statusTone(migration.status)} live={live}>
            {statusLabel(migration.status)}
          </AdminStatusPill>
          {migration.canRun ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => onRequest(migration.key)}
            >
              {running ? "Running…" : actionLabel}
            </Button>
          ) : null}
        </div>
      </div>

      <p className="font-mono text-xs text-[var(--muted)]">{migrationMeta(migration)}</p>

      {migration.lastError ? (
        <p className="text-xs text-[var(--danger)]">{migration.lastError}</p>
      ) : null}

      {result ? (
        <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/25 p-3 font-mono text-[10px] text-[var(--muted)]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </article>
  );
};
