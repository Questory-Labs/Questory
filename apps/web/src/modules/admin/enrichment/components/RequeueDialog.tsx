"use client";

import { Button, Dialog } from "@/components/ui";
import type { EnrichmentItem } from "../admin.enrichment.types";

export type RequeueTarget =
  | { kind: "all"; count: number }
  | { kind: "one"; item: EnrichmentItem };

export const RequeueDialog = ({
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: RequeueTarget | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => (
  <Dialog
    open={target != null}
    onClose={onCancel}
    title={
      target?.kind === "all"
        ? `Requeue ${target.count} failed job${target.count === 1 ? "" : "s"}?`
        : "Requeue this job?"
    }
  >
    <p className="text-sm text-[var(--muted)]">
      {target?.kind === "all"
        ? "Every failed job in this domain goes back into the queue to be retried."
        : "This job goes back into the queue to be retried."}
    </p>
    {target?.kind === "one" ? (
      <div className="mt-3 rounded-2xl border border-[var(--line)] bg-white/[0.03] px-3 py-2">
        <p className="text-[var(--ink)]">{target.item.label}</p>
        {target.item.error ? (
          <p className="mt-1 font-mono text-xs text-[var(--danger)]">
            {target.item.error}
          </p>
        ) : null}
      </div>
    ) : null}
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="danger" onClick={onConfirm} disabled={busy}>
        Requeue
      </Button>
    </div>
  </Dialog>
);
