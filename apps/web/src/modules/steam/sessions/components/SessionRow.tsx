"use client";

import { useState } from "react";
import Link from "next/link";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import type {
  PlaySessionDeleteResult,
  PlaySessionItem,
} from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import { Button, Dialog } from "@/components/ui";
import { api } from "@/lib/api";
import { formatSessionDuration } from "./session-format";
import { formatClockRange, sessionSpan } from "./sessions-insights";
import { SessionAssignDialog } from "./SessionAssignDialog";

export const SessionRow = ({ item }: { item: PlaySessionItem }) => {
  const store = useStore();
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const title = item.game?.name ?? item.title;
  const unmatched = !item.gameId;
  const where = item.hostName ?? item.hostOs ?? item.source;
  const span = sessionSpan(item.startedAt, item.durationSecs);

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
    <li className="group q-row flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl px-3.5 py-1.5">
      <span className="flex min-w-0 flex-[1_1_220px] items-center gap-2.5">
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 flex-none rounded-full",
            unmatched
              ? "bg-[var(--warn)] shadow-[0_0_8px_var(--warn)]"
              : "bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]",
          )}
        />
        <span className="min-w-0">
          {item.gameId ? (
            <Link
              href={`/library/${item.gameId}`}
              className="block truncate font-normal text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {title}
            </Link>
          ) : (
            <span className="block truncate font-normal text-[#f5c56b]">
              {title}
              <span className="sr-only"> (unmatched)</span>
            </span>
          )}
          <span className="block truncate font-mono text-[10px] text-[var(--faint)]">
            {formatClockRange(item.startedAt, item.endedAt)}
            {where ? ` · ${where}` : ""}
          </span>
        </span>
      </span>
      <span
        aria-hidden="true"
        className="relative h-3.5 w-[240px] flex-none [background-image:repeating-linear-gradient(90deg,rgba(255,255,255,0.12)_0_1px,transparent_1px_10px)]"
      >
        <span
          className={cn(
            "absolute bottom-[3px] top-[3px] min-w-[3px] rounded transition-[background-color,box-shadow] duration-400",
            unmatched
              ? "bg-[var(--warn)]"
              : "bg-[#bdbdc2] group-hover:bg-white group-hover:shadow-[0_0_12px_rgba(255,255,255,0.7)]",
          )}
          style={{ left: span.left, width: span.width }}
        />
      </span>
      <span className="w-16 text-right text-xl font-extralight tracking-[-0.02em] tabular-nums">
        {formatSessionDuration(item.durationSecs)}
      </span>
      <button
        type="button"
        onClick={() => setAssignOpen(true)}
        className={cn(
          "min-h-9 rounded-full border bg-transparent px-3.5 text-[13px] transition-colors duration-300 hover:border-white/[0.22] hover:bg-white/[0.08] hover:text-white",
          unmatched
            ? "border-[rgba(245,165,36,0.35)] text-[#f5c56b]"
            : "border-white/[0.12] text-[var(--ink)]",
        )}
      >
        {unmatched ? "Assign game" : "Edit"}
      </button>
      <button
        type="button"
        aria-label="Delete session"
        onClick={() => setDeleteOpen(true)}
        className="grid min-h-9 min-w-9 place-items-center rounded-full border border-transparent bg-transparent text-[var(--muted)] transition-colors duration-300 hover:border-white/[0.22] hover:bg-white/[0.08] hover:text-white"
      >
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>

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
