"use client";

import { Button } from "@questorylabs/ui";
import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useUserSync } from "./useUserSync";

export const SyncNowButton = ({ className = "" }: { className?: string }) => {
  const sync = useUserSync();
  const { active } = useSyncJobs();
  const label = active ? "Syncing…" : sync.busy ? "Starting…" : "Sync now";
  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <Button
        variant="secondary"
        size="sm"
        disabled={sync.disabled || active}
        onClick={sync.sync}
      >
        {label}
      </Button>
      {sync.error ? (
        <p role="status" className="text-xs text-[var(--warn)]">
          {sync.error}
          {sync.retryIn > 0 ? ` Try again in ${sync.retryIn}s.` : ""}
        </p>
      ) : sync.queued && !active ? (
        <p role="status" className="text-xs text-[var(--muted)]">
          Sync queued.
        </p>
      ) : null}
    </div>
  );
};
