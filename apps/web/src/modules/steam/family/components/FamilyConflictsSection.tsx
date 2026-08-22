"use client";

import type { FamilyLibrary } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Dispatch, SetStateAction } from "react";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";
import { FAMILY_LIBRARY_PAGE_SIZE } from "@/lib/pagination";

export const FamilyConflictsSection = ({
  conflicts,
  conflictsPage,
  setConflictsPage,
  setSelectedAppId,
}: {
  conflicts: UseResourceResult<FamilyLibrary>;
  conflictsPage: number;
  setConflictsPage: Dispatch<SetStateAction<number>>;
  setSelectedAppId: (appId: number | null) => void;
}) => {
  const conflictsTotal = conflicts.value?.total ?? 0;
  const conflictsPageSize =
    conflicts.value?.pageSize ?? FAMILY_LIBRARY_PAGE_SIZE;
  const conflictsTotalPages = Math.max(
    1,
    Math.ceil(conflictsTotal / conflictsPageSize),
  );

  return (
    <section className="mt-12">
      <h2 className="mb-4 font-display text-xl font-bold tracking-tight">
        License conflicts
      </h2>
      <p className="mb-3 text-sm text-[var(--muted)]">
        {conflicts.empty
          ? "Loading overlapping games…"
          : `${conflictsTotal} games owned by more than one family member`}
      </p>
      <ResourceStatus
        failed={conflicts.failed}
        empty={conflicts.empty}
        loading={<SkeletonListRows count={6} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load license conflicts.
              </span>
            }
          />
        }
      >
        {conflictsTotal === 0 ? (
          <EmptyState title="No overlapping games between members yet." />
        ) : (
          <>
            <div className="space-y-2">
              {(conflicts.value?.items || []).map((c) => (
                <button
                  key={c.appId}
                  type="button"
                  onClick={() => setSelectedAppId(c.appId)}
                  className="panel-outline flex w-full items-center justify-between px-4 py-3 text-left text-sm hover:border-[var(--accent)]"
                >
                  <span>{c.name}</span>
                  <span className="text-[var(--muted)]">
                    {c.owners.map((o) => o.personaName).join(", ")}
                  </span>
                </button>
              ))}
            </div>

            {conflictsTotal > conflictsPageSize ? (
              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  disabled={conflictsPage <= 1}
                  onClick={() =>
                    setConflictsPage((p) => Math.max(1, p - 1))
                  }
                  className="px-3 py-1.5"
                >
                  Previous
                </Button>
                <span className="font-mono text-xs text-[var(--muted)]">
                  {conflictsPage} / {conflictsTotalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={conflictsPage >= conflictsTotalPages}
                  onClick={() =>
                    setConflictsPage((p) =>
                      Math.min(conflictsTotalPages, p + 1),
                    )
                  }
                  className="px-3 py-1.5"
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </ResourceStatus>
    </section>
  );
};
