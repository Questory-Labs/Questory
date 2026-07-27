"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchWatchHealth, WATCH_FLAG_ENABLED } from "@/lib/watch";

/** Watch menus/routes: feature flag ON and watch /health ok. */
export function useWatchEnabled() {
  const health = useQuery({
    queryKey: ["watch-health"],
    queryFn: fetchWatchHealth,
    enabled: WATCH_FLAG_ENABLED,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const enabled =
    WATCH_FLAG_ENABLED && health.data?.ok === true && !health.isError;

  return {
    enabled,
    flag: WATCH_FLAG_ENABLED,
    flagOn: WATCH_FLAG_ENABLED,
    healthOk: health.data?.ok === true,
    showWatchNav: enabled,
    isLoading: WATCH_FLAG_ENABLED && health.isLoading,
    health,
  };
}
