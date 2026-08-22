"use client";

import { watchFetch } from "@/lib/watch";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { MediaHistoryController } from "@/modules/media/history/media.history.controller";
import type { WatchRecentPage } from "@questorylabs/shared";
import type { PropsWithChildren } from "react";

export const WatchHistoryController = ({ children }: PropsWithChildren) => (
  <MediaHistoryController
    resourceKey="watch-recent"
    load={(page) =>
      watchFetch<WatchRecentPage>(
        `/analytics/recent?page=${page}&pageSize=${MEDIA_HISTORY_PAGE_SIZE}`,
      )
    }
  >
    {children}
  </MediaHistoryController>
);
