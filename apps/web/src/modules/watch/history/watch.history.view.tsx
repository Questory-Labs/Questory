"use client";

import Link from "next/link";
import { WatchAddButton } from "@/components/watch/WatchAddButton";
import { formatDateTime } from "@/lib/dates";
import { formatYourWatchRating } from "@/lib/watch";
import { MediaHistoryView } from "@/modules/media/history/media.history.view";
import type { MediaHistoryPage } from "@/modules/media/history/media.history.types";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WatchRecentEvent } from "@questorylabs/shared";

type WatchHistoryViewProps = {
  recent: UseResourceResult<MediaHistoryPage<WatchRecentEvent>>;
  page: number;
  setPage: (page: number) => void;
};

export const WatchHistoryView = (props: Record<string, unknown>) => {
  const { recent, page, setPage } = props as WatchHistoryViewProps;

  return (
    <MediaHistoryView
      recent={recent}
      page={page}
      setPage={setPage}
      title="History"
      description="Watch events across all connected sources."
      actions={<WatchAddButton />}
      emptyTitle="No watch events yet"
      emptyDescription="Add a watch, or connect a source under Watch → Sources to start ingesting."
      errorMessage="Could not load watch history."
      renderItem={(e) => (
        <li
          key={e.id}
          className="border-b border-[var(--line)] pb-3 text-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/watch/titles/${e.title.id}`}
              className="text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {e.title.name}
              {e.episode
                ? ` · S${e.episode.seasonNumber}E${e.episode.episodeNumber}`
                : ""}
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
              {e.source} · {e.precision}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            {formatDateTime(e.watchedAt)}
            {e.rating != null ? ` · ${formatYourWatchRating(e.rating)}` : ""}
          </p>
        </li>
      )}
    />
  );
};
