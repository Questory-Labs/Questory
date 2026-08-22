"use client";

import Link from "next/link";
import { formatDateTime } from "@/lib/dates";
import { MediaHistoryView } from "@/modules/media/history/media.history.view";
import type { MediaHistoryPage } from "@/modules/media/history/media.history.types";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadRecentEvent } from "@questorylabs/shared";

type ReadHistoryViewProps = {
  recent: UseResourceResult<MediaHistoryPage<ReadRecentEvent>>;
  page: number;
  setPage: (page: number) => void;
};

export const ReadHistoryView = (props: Record<string, unknown>) => {
  const { recent, page, setPage } = props as ReadHistoryViewProps;

  return (
    <MediaHistoryView
      recent={recent}
      page={page}
      setPage={setPage}
      title="History"
      description="Reading progress events across connected sources."
      emptyTitle="No reading events yet"
      emptyDescription="Connect AniList under Read → Sources to start syncing."
      errorMessage="Could not load read history."
      renderItem={(e) => (
        <li
          key={e.id}
          className="border-b border-[var(--line)] pb-3 text-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/read/titles/${e.title.id}`}
              className="text-[var(--ink)] hover:text-[var(--accent)]"
            >
              {e.title.name}
              {e.chaptersRead != null ? ` · Ch. ${e.chaptersRead}` : ""}
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
              {e.source} · {e.title.format}
              {e.status ? ` · ${e.status}` : ""}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-[var(--muted)]">
            {formatDateTime(e.readAt)}
            {e.progress > 0 ? ` · ${e.progress}%` : ""}
          </p>
        </li>
      )}
    />
  );
};
