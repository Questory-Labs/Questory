"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { MusicRecentPage } from "@questorylabs/shared";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";
import { musicFetch } from "@/lib/music";
import { MUSIC_LISTENING_PAGE_SIZE } from "@/lib/pagination";

export const MusicListeningController = ({ children }: PropsWithChildren) => {
  const [page, setPage] = useState(1);
  const playing = useMusicPlayingNow();
  const recent = useResource({
    id: ["music-recent", page],
    load: () =>
      musicFetch<MusicRecentPage>(
        `/analytics/recent?page=${page}&pageSize=${MUSIC_LISTENING_PAGE_SIZE}`,
      ),
  });

  return cloneElements(children, { recent, playing, page, setPage });
};
