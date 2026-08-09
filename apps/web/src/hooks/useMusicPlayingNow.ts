"use client";

import { useMemo } from "react";
import { useLiveResource } from "@questorylabs/qhttp/react";
import { withApiVersion, type MusicPlayingNow } from "@questorylabs/shared";
import { subscribeSse } from "@/lib/sse-client";
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

/** Now-playing via authenticated SSE with an initial GET. */
export function useMusicPlayingNow(opts?: { enabled?: boolean }) {
  const streamUrl = useMemo(() => playingNowStreamUrl(), []);

  return useLiveResource<MusicPlayingNow>({
    id: MUSIC_PLAYING_NOW_QUERY_KEY,
    load: () => musicFetch<MusicPlayingNow>("/analytics/playing-now"),
    when: opts?.enabled ?? true,
    subscribe: (onEvent, signal) =>
      subscribeSse(streamUrl, { onMessage: onEvent }, signal),
  });
}
