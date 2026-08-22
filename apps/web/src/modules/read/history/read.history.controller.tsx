"use client";

import { readFetch } from "@/lib/read";
import { MEDIA_HISTORY_PAGE_SIZE } from "@/lib/pagination";
import { MediaHistoryController } from "@/modules/media/history/media.history.controller";
import type { ReadRecentPage } from "@questorylabs/shared";
import type { PropsWithChildren } from "react";

export const ReadHistoryController = ({ children }: PropsWithChildren) => (
  <MediaHistoryController
    resourceKey="read-recent"
    load={(page) =>
      readFetch<ReadRecentPage>(
        `/analytics/recent?page=${page}&pageSize=${MEDIA_HISTORY_PAGE_SIZE}`,
      )
    }
  >
    {children}
  </MediaHistoryController>
);
