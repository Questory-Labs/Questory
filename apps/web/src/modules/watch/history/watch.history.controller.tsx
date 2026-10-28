"use client";

import { useState, type PropsWithChildren } from "react";
import { watchFetch, WATCH_LOG_SEARCH_DEBOUNCE_MS } from "@/lib/watch";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { MediaHistoryController } from "@/modules/media/history/media.history.controller";
import { useDebouncedValue } from "@/modules/music/hooks/useDebouncedValue";
import type { WatchRecentPage } from "@questorylabs/shared";
import type { WatchMediaFilter } from "../home/watch.home.types";
import { watchHistoryQuery } from "./watch.history.utils";

export const WatchHistoryController = ({ children }: PropsWithChildren) => {
  const [type, setType] = useState<WatchMediaFilter>("all");
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim(), WATCH_LOG_SEARCH_DEBOUNCE_MS);

  return (
    <MediaHistoryController
      resourceKey="watch-recent"
      filterKey={`${type}|${q}`}
      extra={{ type, setType, query, setQuery }}
      load={(page) =>
        watchFetch<WatchRecentPage>(
          `/analytics/recent?${watchHistoryQuery(page, MEDIA_HISTORY_PAGE_SIZE, type, q)}`,
        )
      }
    >
      {children}
    </MediaHistoryController>
  );
};
