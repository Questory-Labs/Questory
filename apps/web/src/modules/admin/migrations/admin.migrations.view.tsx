"use client";

import { Button, Dialog } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import type { AdminMigrationsViewProps } from "./admin.migrations.types";
import { MigrationCard } from "./components/MigrationCard";

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
    <div className="flex flex-col gap-3.5">
      <p className="q-in px-1 text-sm font-light text-[var(--muted)] [--i:1]">
        One-off data migrations. Each runs once; failed runs can be retried and
        are safe to repeat.
      </p>

      {run.failed ? (
        <p className="text-sm text-[var(--danger)]">{(run.error as Error).message}</p>
      ) : null}

      <ResourceStatus
        failed={migrations.failed}
        empty={migrations.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="text-sm text-[var(--warm)]">
            {(migrations.error as Error)?.message}
          </p>
        }
      >
        <div className="flex flex-col gap-3.5">
          {(migrations.value?.migrations || []).map((migration) => (
            <MigrationCard
              key={migration.key}
              migration={migration}
              busy={run.busy}
              running={run.busy && run.input === migration.key}
              onRequest={setConfirmKey}
            />
          ))}

          {!migrations.value?.migrations?.length ? (
            <p className="px-1 text-sm text-[var(--muted)]">
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
          <div className="mt-3 rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2">
            <p className="text-[var(--ink)]">{pendingMigration.name}</p>
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
    </div>
  );
};
