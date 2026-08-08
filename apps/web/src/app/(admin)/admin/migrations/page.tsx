"use client";

import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import { useState } from "react";
import { Button, Dialog, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type MigrationItem = {
  key: string;
  name: string;
  description: string;
  hasRun: boolean;
  status: string;
  runCount: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastError: string | null;
  lastResult: string | null;
  canRun: boolean;
};

type MigrationsResponse = {
  migrations: MigrationItem[];
};

function statusLabel(status: string) {
  switch (status) {
    case "not_run":
      return "Not run";
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function parseResult(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export default function AdminMigrationsPage() {
  const qc = useQueryClient();
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const migrations = useQuery({
    queryKey: ["admin-migrations"],
    queryFn: () => api<MigrationsResponse>("/admin/migrations"),
    refetchInterval: 5_000,
  });

  const run = useMutation({
    mutationFn: (key: string) =>
      api(`/admin/migrations/${encodeURIComponent(key)}/run`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-migrations"] });
    },
  });

  const pendingMigration = migrations.data?.migrations.find(
    (m) => m.key === confirmKey,
  );

  function handleConfirmRun() {
    if (!confirmKey) return;
    run.mutate(confirmKey);
    setConfirmKey(null);
  }

  return (
    <>
      <PageHeader
        title="Migrations"
        description="One-off data repairs for existing imports. Run once after deploy, or retry if a migration failed."
      />

      {migrations.isError ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(migrations.error as Error).message}
        </p>
      ) : null}

      {run.isError ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(run.error as Error).message}
        </p>
      ) : null}

      <div className="space-y-4">
        {(migrations.data?.migrations || []).map((migration) => {
          const result = parseResult(migration.lastResult);
          const actionLabel = migration.hasRun ? "Retry" : "Run";

          return (
            <Panel key={migration.key} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-bold">
                    {migration.name}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {migration.description}
                  </p>
                  <p className="mt-2 font-mono text-[10px] text-[var(--faint)]">
                    {migration.key}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  disabled={!migration.canRun || run.isPending}
                  onClick={() => setConfirmKey(migration.key)}
                >
                  {run.isPending && run.variables === migration.key
                    ? "Running…"
                    : actionLabel}
                </Button>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>
                  Status:{" "}
                  <span className="font-medium">
                    {statusLabel(migration.status)}
                  </span>
                </span>
                <span className="text-[var(--muted)]">
                  Runs: {migration.runCount}
                </span>
                {migration.lastStartedAt ? (
                  <span className="text-[var(--muted)]">
                    Last started{" "}
                    {new Date(migration.lastStartedAt).toLocaleString()}
                  </span>
                ) : null}
                {migration.lastCompletedAt ? (
                  <span className="text-[var(--muted)]">
                    Last completed{" "}
                    {new Date(migration.lastCompletedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>

              {migration.lastError ? (
                <p className="text-xs text-[var(--warm)]">
                  {migration.lastError}
                </p>
              ) : null}

              {result ? (
                <pre className="overflow-x-auto rounded border border-[var(--line)] bg-[var(--bg-1)] p-3 font-mono text-[10px] text-[var(--muted)]">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : null}
            </Panel>
          );
        })}

        {!migrations.isLoading && !migrations.data?.migrations?.length ? (
          <p className="text-sm text-[var(--muted)]">
            No migrations are registered.
          </p>
        ) : null}
      </div>

      <Dialog
        open={confirmKey != null}
        onClose={() => setConfirmKey(null)}
        title={pendingMigration?.hasRun ? "Retry migration?" : "Run migration?"}
      >
        <p className="text-sm text-[var(--muted)]">
          {pendingMigration?.hasRun
            ? "This will re-run the data repair. Only retry if the previous attempt failed or you need to apply fixes again."
            : "This will modify existing imported data. Run once after deploy, or when recovering from a failed migration."}
        </p>
        {pendingMigration ? (
          <div className="mt-3 rounded border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2">
            <p className="font-medium text-[var(--ink)]">
              {pendingMigration.name}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {pendingMigration.description}
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmKey(null)}>
            Cancel
          </Button>
          <Button onClick={handleConfirmRun} disabled={run.isPending}>
            {pendingMigration?.hasRun ? "Retry" : "Run"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
