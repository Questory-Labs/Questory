"use client";

import { Button, Dialog, PageHeader, Panel } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import type { AdminMigrationsViewProps } from "./admin.migrations.types";
import { parseResult, statusLabel } from "./admin.migrations.utils";

export const AdminMigrationsView = (props: Record<string, unknown>) => {
  const { confirmKey, setConfirmKey, migrations, run } =
    props as AdminMigrationsViewProps;

  const pendingMigration = migrations.value?.migrations.find(
    (m) => m.key === confirmKey,
  );

  const handleConfirmRun = () => {
    if (!confirmKey) return;
    run.submit(confirmKey);
    setConfirmKey(null);
  };

  return (
    <>
      <PageHeader
        title="Migrations"
        description="One-off data repairs for existing imports. Run once after deploy, or retry if a migration failed."
      />

      {run.failed ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(run.error as Error).message}
        </p>
      ) : null}

      <ResourceStatus
        failed={migrations.failed}
        empty={migrations.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="mb-4 text-sm text-[var(--warm)]">
            {(migrations.error as Error)?.message}
          </p>
        }
      >
        <div className="space-y-4">
          {(migrations.value?.migrations || []).map((migration) => {
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
                    disabled={!migration.canRun || run.busy}
                    onClick={() => setConfirmKey(migration.key)}
                  >
                    {run.busy && run.input === migration.key
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

          {!migrations.value?.migrations?.length ? (
            <p className="text-sm text-[var(--muted)]">
              No migrations are registered.
            </p>
          ) : null}
        </div>
      </ResourceStatus>

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
          <Button onClick={handleConfirmRun} disabled={run.busy}>
            {pendingMigration?.hasRun ? "Retry" : "Run"}
          </Button>
        </div>
      </Dialog>
    </>
  );
};
