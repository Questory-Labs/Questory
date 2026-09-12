"use client";

import { FAMILY_MEMBER_LIMIT, type Friend, type FriendsListResponse } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import {
  Button,
  Dialog,
  EmptyState,
  ResourceStatus,
  SkeletonListRows,
} from "@questorylabs/ui";

export const FamilyImportDialog = ({
  open,
  onClose,
  friends,
  importable,
  selected,
  importFilter,
  setImportFilter,
  toggle,
  toggleAll,
  importBusy,
  onImportSelected,
  importError,
  remainingSlots,
}: {
  open: boolean;
  onClose: () => void;
  friends: UseResourceResult<FriendsListResponse>;
  importable: Friend[];
  selected: Set<string>;
  importFilter: string;
  setImportFilter: (value: string) => void;
  toggle: (id: string) => void;
  toggleAll: () => void;
  importBusy: boolean;
  onImportSelected: () => void;
  importError: string | null;
  remainingSlots: number;
}) => {
  const handleClose = () => {
    if (importBusy) return;
    onClose();
  };
  const atCap = remainingSlots <= 0 || selected.size >= remainingSlots;
  const allSelected =
    importable.length > 0 && importable.every((f) => selected.has(f.steamId));
  const filled =
    remainingSlots > 0 &&
    selected.size >= remainingSlots &&
    importable.some((f) => selected.has(f.steamId));

  const emptyTitle =
    remainingSlots <= 0
      ? `Family is full (${FAMILY_MEMBER_LIMIT} people, including you). Remove someone to add another friend.`
      : (friends.value?.friends || []).length === 0
        ? "No friends synced yet. Open Friends after Steam is linked."
        : "All synced friends are already in your family group.";

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import from friends"
      size="lg"
    >
      <input
        value={importFilter}
        onChange={(e) => setImportFilter(e.target.value)}
        placeholder="Filter friends…"
        className="field mt-0 w-full"
      />

      {remainingSlots > 0 ? (
        <p className="mt-2 text-xs text-[var(--muted)]">
          {remainingSlots} slot{remainingSlots === 1 ? "" : "s"} left (max{" "}
          {FAMILY_MEMBER_LIMIT} people, including you).
        </p>
      ) : null}

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
          {remainingSlots > 0 && importable.length ? (
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
                      disabled={importBusy || (!checked && atCap)}
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
                    <span className="min-w-0 flex-1 truncate">
                      {f.personaName}
                    </span>
                  </label>
                );
              })}
            </>
          ) : (
            <EmptyState title={emptyTitle} />
          )}
        </ResourceStatus>
      </div>

      {importError ? (
        <p className="mt-3 text-sm text-[var(--danger)]">{importError}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <Button
          variant="secondary"
          onClick={toggleAll}
          disabled={!importable.length || importBusy || remainingSlots <= 0}
          className="h-9 px-3 text-xs"
        >
          {allSelected || filled ? "Deselect all" : "Select all"}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={importBusy}
            className="h-9"
          >
            Cancel
          </Button>
          <Button
            disabled={selected.size === 0 || importBusy || remainingSlots <= 0}
            onClick={onImportSelected}
            className="h-9"
          >
            {importBusy ? "Importing…" : `Add selected (${selected.size})`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
