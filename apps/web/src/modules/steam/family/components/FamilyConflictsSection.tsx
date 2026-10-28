"use client";

import type { FamilyLibrary } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { Dispatch, SetStateAction } from "react";
import { Button, ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { FAMILY_LIBRARY_PAGE_SIZE } from "@/lib/pagination";
import { FamilyListPanel } from "./FamilyListPanel";

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
  const pending = conflicts.failed || conflicts.empty;

  const rows = (conflicts.value?.items || []).map((c) => ({
    key: c.appId,
    title: c.name,
    detail: (c.owners ?? [])
      .map((o) => (o.isMe ? "You" : o.personaName))
      .join(", "),
    onClick: () => setSelectedAppId(c.appId),
  }));

  return (
    <FamilyListPanel
      title="Bought twice"
      description="Licence conflicts you could have shared"
      tone="var(--warn)"
      index={7}
      rows={rows}
      empty="No overlapping games between members yet."
      status={
        pending ? (
          <ResourceStatus
            failed={conflicts.failed}
            empty={conflicts.empty}
            loading={<SkeletonListRows count={4} className="mt-3" />}
            error={
              <p className="mx-1.5 mt-3 text-sm text-[var(--danger)]">
                Could not load license conflicts.
              </p>
            }
          >
            {null}
          </ResourceStatus>
        ) : undefined
      }
      footer={
        <>
          {!pending && conflictsTotal > 0 ? (
            <p className="label-mono mx-1.5 mt-2">
              {conflictsTotal} games owned by more than one family member
            </p>
          ) : null}
          {conflictsTotal > conflictsPageSize ? (
            <div className="mt-3 flex items-center justify-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                disabled={conflictsPage <= 1}
                onClick={() => setConflictsPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-[var(--muted)]">
                {conflictsPage} / {conflictsTotalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={conflictsPage >= conflictsTotalPages}
                onClick={() =>
                  setConflictsPage((p) => Math.min(conflictsTotalPages, p + 1))
                }
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      }
    />
  );
};
