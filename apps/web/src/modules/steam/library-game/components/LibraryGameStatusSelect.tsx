"use client";

import type { LibraryUserStatus } from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import {
  LIBRARY_STATUS_LABELS,
  LIBRARY_STATUS_TONE,
} from "../../library/steam.library.constants";

const STATUSES = Object.keys(LIBRARY_STATUS_LABELS) as LibraryUserStatus[];

export const LibraryGameStatusSelect = ({
  status,
  busy,
  onChange,
}: {
  status: LibraryUserStatus | null;
  busy?: boolean;
  onChange: (status: LibraryUserStatus | null) => void;
}) => (
  <label
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-[rgba(10,10,11,0.6)] py-1 pl-3 pr-2 backdrop-blur-md",
      status ? LIBRARY_STATUS_TONE[status] : "text-[var(--muted)]",
    )}
  >
    <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full bg-current" />
    <span className="sr-only">Status</span>
    <select
      value={status ?? ""}
      disabled={busy}
      onChange={(e) =>
        onChange(e.target.value ? (e.target.value as LibraryUserStatus) : null)
      }
      className="cursor-pointer border-0 bg-transparent text-xs text-current outline-none disabled:opacity-60"
    >
      <option value="">No status</option>
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {LIBRARY_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  </label>
);
