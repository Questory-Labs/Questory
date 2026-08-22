"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type {
  PlaySessionDeleteResult,
  PlaySessionItem,
} from "@questorylabs/shared";
import { Button, Dialog } from "@/components/ui";
import { api } from "@/lib/api";
import { formatRowTime } from "@/lib/dates";
import { SessionAssignDialog } from "./SessionAssignDialog";

const formatDuration = (secs: number): string => {
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
};

export const SessionRow = ({ item }: { item: PlaySessionItem }) => {
  const store = useStore();
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const title = item.game?.name ?? item.title;
  const thumb = item.game?.headerImage ?? null;
  const hostBits = [item.hostName, item.hostOs].filter(Boolean).join(" · ");

  const del = useAction({
    run: () =>
      api<PlaySessionDeleteResult>(`/play-sessions/${item.id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      store.touch(["play-sessions"]);
      setDeleteOpen(false);
    },
  });

  return (
    <li className="flex items-start gap-3 py-3">
      <div className="h-10 w-[5.4rem] shrink-0 overflow-hidden bg-[var(--bg-2)]">
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center hatch-fill text-[10px] text-[var(--faint)]">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {item.gameId ? (
            <Link
              href={`/library/${item.gameId}`}
              className="text-sm text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {title}
            </Link>
          ) : (
            <span className="text-sm text-[var(--ink)]">{title}</span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
            {formatRowTime(item.endedAt)}
          </span>
        </div>
        <p className="mt-1 font-mono text-xs text-[var(--muted)]">
          {formatDuration(item.durationSecs)}
          {item.source ? ` · ${item.source}` : ""}
          {hostBits ? ` · ${hostBits}` : ""}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
          >
            Assign
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded border border-[var(--line)] px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--danger)]"
          >
            Delete
          </button>
        </div>
      </div>

      <SessionAssignDialog
        open={assignOpen}
        session={item}
        onClose={() => setAssignOpen(false)}
      />

      <Dialog
        open={deleteOpen}
        onClose={() => {
          if (del.busy) return;
          setDeleteOpen(false);
        }}
        title="Delete session?"
      >
        <p className="text-sm text-[var(--muted)]">
          Permanently delete this play session
          {title ? ` for “${title}”` : ""}. This cannot be undone.
        </p>
        {del.error ? (
          <p className="mt-3 text-sm text-[var(--danger)]">{del.error.message}</p>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => setDeleteOpen(false)}
            disabled={del.busy}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => del.submit()}
            disabled={del.busy}
          >
            {del.busy ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </li>
  );
}
