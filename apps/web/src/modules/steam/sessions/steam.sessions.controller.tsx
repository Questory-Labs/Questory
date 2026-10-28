"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { PlaySessionPage, PlaySessionStats } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { groupByLocalDay, withTz } from "@/lib/dates";
import { PLAY_SESSIONS_PAGE_SIZE } from "@/lib/pagination";
import { SESSIONS_DEFAULT_RANGE, type SessionsRange } from "./steam.sessions.constants";

export const SessionsController = ({ children }: PropsWithChildren) => {
  const [page, setPage] = useState(1);
  const [range, setRange] = useState<SessionsRange>(SESSIONS_DEFAULT_RANGE);
  const stats = useResource({
    id: ["play-sessions", "stats", range],
    load: () => api<PlaySessionStats>(withTz(`/play-sessions/stats?days=${range}`)),
  });
  const sessions = useResource({
    id: ["play-sessions", page],
    load: () =>
      api<PlaySessionPage>(
        `/play-sessions?page=${page}&pageSize=${PLAY_SESSIONS_PAGE_SIZE}`,
      ),
  });

  const items = sessions.value?.items ?? [];
  const dayGroups = groupByLocalDay(items, (s) => s.endedAt);

  return cloneElements(children, {
    sessions,
    stats,
    page,
    setPage,
    dayGroups,
    range,
    setRange,
  });
};
