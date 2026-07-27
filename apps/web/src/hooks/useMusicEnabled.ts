"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMusicHealth, MUSIC_FLAG_ENABLED } from "@/lib/music";

/** Music menus/routes: feature flag ON and music /health ok. */
export function useMusicEnabled() {
  const health = useQuery({
    queryKey: ["music-health"],
    queryFn: fetchMusicHealth,
    enabled: MUSIC_FLAG_ENABLED,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const showMusicNav =
    MUSIC_FLAG_ENABLED && health.data?.ok === true && !health.isError;

  return {
    flagOn: MUSIC_FLAG_ENABLED,
    healthOk: health.data?.ok === true,
    showMusicNav,
    isLoading: MUSIC_FLAG_ENABLED && health.isLoading,
    health,
  };
}
