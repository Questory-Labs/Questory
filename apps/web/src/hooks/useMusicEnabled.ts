"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchMusicHealth, isMusicFlagEnabled } from "@/lib/music";

/** Music menus/routes: feature flag ON and music /health ok. */
export function useMusicEnabled() {
  const flagOn = isMusicFlagEnabled();
  const health = useQuery({
    queryKey: ["music-health"],
    queryFn: fetchMusicHealth,
    enabled: flagOn,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const showMusicNav = flagOn && health.data?.ok === true && !health.isError;

  return {
    flagOn,
    healthOk: health.data?.ok === true,
    showMusicNav,
    isLoading: flagOn && health.isLoading,
    health,
  };
}
