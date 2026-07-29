"use client";

import { useMemo } from "react";
import { withApiVersion, type MusicPlayingNow } from "@questorylabs/shared";
import { useSseBackedQuery } from "@/hooks/useSseBackedQuery";
import { getApiUrl } from "@/lib/runtime-env";
import { musicFetch } from "@/lib/music";

export const MUSIC_PLAYING_NOW_QUERY_KEY = ["music-playing-now"] as const;

function playingNowStreamUrl() {
  const path = withApiVersion("/music/analytics/playing-now/stream", [
    "/health",
    "/1",
    "/apis",
  ]);
  return `${getApiUrl()}${path}`;
}

/** Now-playing via authenticated SSE; falls back to slow polling if the stream drops. */
export function useMusicPlayingNow(opts?: { enabled?: boolean }) {
  const streamUrl = useMemo(() => playingNowStreamUrl(), []);

  return useSseBackedQuery<MusicPlayingNow>({
    queryKey: MUSIC_PLAYING_NOW_QUERY_KEY,
    queryFn: () => musicFetch<MusicPlayingNow>("/analytics/playing-now"),
    streamUrl,
    enabled: opts?.enabled ?? true,
    pollInterval: (data) => (data?.track ? 5_000 : 30_000),
  });
}
