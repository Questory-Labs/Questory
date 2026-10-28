"use client";

import { useRef, useState, type PropsWithChildren } from "react";
import { useAction, useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  MusicListenSource,
  MusicRecentListen,
  MusicRecentPage,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";
import { withTz } from "@/lib/dates";
import { musicFetch } from "@/lib/music";
import { MUSIC_LISTENING_PAGE_SIZE } from "@/lib/pagination";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { dayTotalsRange, mergeListens, recentPath } from "./music.listening.utils";

const SEARCH_DEBOUNCE_MS = 300;

export const MusicListeningController = ({ children }: PropsWithChildren) => {
  const [page, setPageState] = useState(1);
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<MusicListenSource | "all">("all");
  const [older, setOlder] = useState<MusicRecentListen[]>([]);
  const [loadedPages, setLoadedPages] = useState(0);
  const q = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const playing = useMusicPlayingNow();

  const viewKey = `${page}|${q}|${source}`;
  const viewKeyRef = useRef(viewKey);
  const [seenFilters, setSeenFilters] = useState(`${q}|${source}`);
  if (seenFilters !== `${q}|${source}`) {
    setSeenFilters(`${q}|${source}`);
    setPageState(1);
    setOlder([]);
    setLoadedPages(0);
  }
  viewKeyRef.current = viewKey;

  const recent = useResource({
    id: ["music-recent", page, q, source],
    load: () =>
      musicFetch<MusicRecentPage>(
        recentPath({ page, pageSize: MUSIC_LISTENING_PAGE_SIZE, q, source }),
      ),
  });

  const loadOlderAction = useAction({
    run: (input: { key: string; page: number }) =>
      musicFetch<MusicRecentPage>(
        recentPath({
          page: input.page,
          pageSize: MUSIC_LISTENING_PAGE_SIZE,
          q,
          source,
        }),
      ),
    onSuccess: (data, input) => {
      if (input.key !== viewKeyRef.current) return;
      setOlder((prev) => mergeListens(prev, data.items));
      setLoadedPages((n) => n + 1);
    },
  });

  const items = mergeListens(recent.value?.items ?? [], older);
  const total = recent.value?.total ?? 0;
  const hasOlder = total > (page + loadedPages) * MUSIC_LISTENING_PAGE_SIZE;
  const filtered = Boolean(q) || source !== "all";
  const daysRange = dayTotalsRange(items.at(-1)?.listenedAt);

  const dayTotals = useResource({
    id: ["music-listening-days", daysRange],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(`/analytics/timeseries?granularity=day&range=${daysRange}`),
      ),
  });

  const setPage = (next: number) => {
    setPageState(next);
    setOlder([]);
    setLoadedPages(0);
  };

  const loadOlder = () =>
    loadOlderAction.submit({ key: viewKey, page: page + loadedPages + 1 });

  return cloneElements(children, {
    recent,
    playing,
    page,
    setPage,
    items,
    query,
    setQuery,
    source,
    setSource,
    filtered,
    dayTotals,
    hasOlder,
    loadOlder,
    loadingOlder: loadOlderAction.busy,
    olderFailed: loadOlderAction.failed,
  });
};
