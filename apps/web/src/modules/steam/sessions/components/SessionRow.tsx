"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type {
  PlaySessionDeleteResult,
  PlaySessionItem,
} from "@questorylabs/shared";
import { Button, Dialog } from "@/components/ui";
import { GameCover } from "@/components/GameCover";
import { api } from "@/lib/api";
import { formatRowTime } from "@/lib/dates";
import { formatSessionDuration } from "./session-format";
import { SessionAssignDialog } from "./SessionAssignDialog";

export const SessionRow = ({
  item,
  dayMaxSecs = 0,
}: {
  item: PlaySessionItem;
  dayMaxSecs?: number;
}) => {
  const store = useStore();
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const title = item.game?.name ?? item.title;
  const thumb = item.game?.headerImage ?? null;
  const unmatched = !item.gameId;
  const hostBits = [item.hostName, item.hostOs].filter(Boolean).join(" · ");
  const duration = formatSessionDuration(item.durationSecs);
  const durationPct =
    dayMaxSecs > 0
      ? Math.max(8, Math.round((item.durationSecs / dayMaxSecs) * 100))
      : 0;

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
    <li className="flex items-start gap-3 px-3 py-3 hover:bg-[var(--bg-2)] sm:px-4">
      <GameCover src={thumb} className="w-[4.75rem] shrink-0 sm:w-28" fallback="—" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {item.gameId ? (
                <Link
                  href={`/library/${item.gameId}`}
                  className="truncate text-sm font-medium text-[var(--ink)] hover:text-[var(--accent)]"
                >
                  {title}
                </Link>
              ) : (
                <span className="truncate text-sm font-medium text-[var(--ink)]">
                  {title}
                </span>
              )}
              {unmatched ? (
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--warm)]">
                  Unmatched
                </span>
              ) : null}
            </div>
            <p className="mt-1 truncate font-mono text-[11px] text-[var(--muted)]">
              {item.source}
              {hostBits ? ` · ${hostBits}` : ""}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAssignOpen(true)}
              >
                Assign
              </Button>
              <Button
                variant="ghost-danger"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            </div>
          </div>
          <div className="shrink-0 pt-0.5 text-right">
            <div className="font-mono text-sm tabular-nums text-[var(--ink)]">
              {duration}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-[var(--faint)]">
              {formatRowTime(item.endedAt)}
            </div>
            {durationPct > 0 ? (
              <div
                className="ml-auto mt-2 h-px w-14 overflow-hidden bg-[var(--line)]"
                aria-hidden
              >
                <div
                  className="h-full bg-[var(--accent)]"
                  style={{ width: `${durationPct}%` }}
                />
              </div>
            ) : null}
          </div>
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
};
