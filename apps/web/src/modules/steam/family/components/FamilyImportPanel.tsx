"use client";

import type { Friend, FriendsListResponse } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import {
  Button,
  EmptyState,
  Panel,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";

export const FamilyImportPanel = ({
  friends,
  importable,
  selected,
  importFilter,
  setImportFilter,
  toggle,
  toggleAll,
  importBusy,
  onImportSelected,
}: {
  friends: UseResourceResult<FriendsListResponse>;
  importable: Friend[];
  selected: Set<string>;
  importFilter: string;
  setImportFilter: (value: string) => void;
  toggle: (id: string) => void;
  toggleAll: () => void;
  importBusy: boolean;
  onImportSelected: () => void;
}) => (
  <Panel wrapperClassName="mt-6" className="p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="font-display text-lg font-bold tracking-tight">
        Import from friends
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          onClick={toggleAll}
          disabled={!importable.length}
          className="h-9 px-3 text-xs"
        >
          {importable.length &&
          importable.every((f) => selected.has(f.steamId))
            ? "Deselect all"
            : "Select all"}
        </Button>
        <Button
          disabled={selected.size === 0 || importBusy}
          onClick={onImportSelected}
          className="h-9 px-3 text-xs"
        >
          {importBusy ? "Importing…" : `Add selected (${selected.size})`}
        </Button>
      </div>
    </div>

    <input
      value={importFilter}
      onChange={(e) => setImportFilter(e.target.value)}
      placeholder="Filter friends…"
      className="mt-3 w-full max-w-md rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm"
    />

    <div className="mt-4 max-h-72 space-y-1 overflow-y-auto">
      <ResourceStatus
        failed={friends.failed}
        empty={friends.empty}
        loading={<SkeletonListRows count={6} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load friends.
              </span>
            }
          />
        }
      >
        {importable.length ? (
          <>
            {importable.map((f) => {
              const checked = selected.has(f.steamId);
              return (
                <label
                  key={f.steamId}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-[var(--bg-2)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(f.steamId)}
                    className="accent-[var(--accent)]"
                  />
                  {f.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={f.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-[var(--bg-2)]" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{f.personaName}</span>
                </label>
              );
            })}
          </>
        ) : (
          <EmptyState
            title={
              (friends.value?.friends || []).length === 0
                ? "No friends synced yet. Open Friends after Steam is linked."
                : "All synced friends are already in your family group."
            }
          />
        )}
      </ResourceStatus>
    </div>
  </Panel>
);
