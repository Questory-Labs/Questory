"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { PlaySessionPage } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { groupByLocalDay } from "@/lib/dates";
import { PLAY_SESSIONS_PAGE_SIZE } from "@/lib/pagination";

export const SessionsController = ({ children }: PropsWithChildren) => {
  const [page, setPage] = useState(1);
  const sessions = useResource({
    id: ["play-sessions", page],
    load: () =>
      api<PlaySessionPage>(
        `/play-sessions?page=${page}&pageSize=${PLAY_SESSIONS_PAGE_SIZE}`,
      ),
  });

  const items = sessions.value?.items ?? [];
  const dayGroups = groupByLocalDay(items, (s) => s.endedAt);

  return cloneElements(children, { sessions, page, setPage, dayGroups });
};
