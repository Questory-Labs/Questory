"use client";

import { MediaHistoryRow } from "@/modules/media/history/components/MediaHistoryRow";
import { MediaHistoryView } from "@/modules/media/history/media.history.view";
import type { MediaHistoryPage } from "@/modules/media/history/media.history.types";
import { RatingDots } from "@/modules/media/shelf/components/RatingDots";
import { ShelfSearchField } from "@/modules/media/shelf/components/ShelfSearchField";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WatchRecentEvent } from "@questorylabs/shared";
import { LogWatchButton } from "../home/components/LogWatchButton";
import { WatchMediaPicker } from "../home/components/WatchMediaPicker";
import type { WatchMediaFilter } from "../home/watch.home.types";
import { watchEventDate, watchEventKind, watchEventMeta, watchEventTitle } from "./watch.history.utils";

type WatchHistoryViewProps = {
  recent: UseResourceResult<MediaHistoryPage<WatchRecentEvent>>;
  page: number;
  setPage: (page: number) => void;
  type: WatchMediaFilter;
  setType: (type: WatchMediaFilter) => void;
  query: string;
  setQuery: (q: string) => void;
};

export const WatchHistoryView = (props: Record<string, unknown>) => {
  const { recent, page, setPage, type, setType, query, setQuery } = props as WatchHistoryViewProps;

  return (
    <MediaHistoryView
      recent={recent}
      page={page}
      setPage={setPage}
      eyebrow="Watch · History"
      title={
        <>
          Everything you watched, <span className="font-serif text-[#efd9a8]">newest first</span>
        </>
      }
      actions={<LogWatchButton />}
      toolbar={
        <>
          <WatchMediaPicker value={type} onChange={setType} />
          <ShelfSearchField label="Search history" placeholder="Search titles" value={query} onChange={setQuery} />
        </>
      }
      listLabel="Watch history"
      emptyTitle={type === "all" && !query ? "No watch events yet" : "Nothing matches"}
      emptyDescription={
        type === "all" && !query
          ? "Log a watch, or connect a source under Sources to start ingesting."
          : "Try another title or media type."
      }
      errorMessage="Could not load watch history."
      renderItem={(e) => (
        <MediaHistoryRow
          key={e.id}
          href={`/watch/titles/${e.title.id}`}
          title={watchEventTitle(e)}
          posterUrl={e.title.posterUrl}
          seed={e.title.id}
          tint="var(--watch)"
          kind={watchEventKind(e)}
          meta={watchEventMeta(e)}
          trailing={<RatingDots rating={e.rating} accent="var(--watch)" />}
          date={watchEventDate(e)}
        />
      )}
    />
  );
};
