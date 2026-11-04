"use client";

import type { MusicListenSource } from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import { LISTEN_SOURCE_OPTIONS } from "../../music.utils";

export const ListeningFilters = ({
  query,
  onQueryChange,
  source,
  onSourceChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  source: MusicListenSource | "all";
  onSourceChange: (source: MusicListenSource | "all") => void;
}) => (
  <div className="q-in flex flex-wrap items-center gap-3 [--i:1]">
    <label className="flex min-h-11 min-w-0 flex-[1_1_320px] items-center gap-2.5 rounded-full border border-white/[0.08] bg-black/25 px-4 text-[var(--muted)]">
      <svg
        aria-hidden="true"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <span className="sr-only">Filter listens</span>
      <input
        type="search"
        value={query}
        maxLength={100}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Filter by track, artist or album"
        className="min-w-0 flex-1 border-0 bg-transparent text-sm font-light text-[var(--ink)] outline-0"
      />
    </label>
    <div role="group" aria-label="Source" className="flex flex-wrap gap-1.5">
      {LISTEN_SOURCE_OPTIONS.map((option) => {
        const selected = option.value === source;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onSourceChange(option.value)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-[13px] transition-colors",
              selected
                ? "border-white/[0.16] bg-white/10 text-white"
                : "border-white/[0.06] bg-black/20 text-[var(--muted)] hover:text-[var(--ink)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);
