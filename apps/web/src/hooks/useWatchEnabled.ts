"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { fetchWatchHealth, isWatchFlagEnabled } from "@/lib/watch";

/** Watch menus/routes: feature flag ON and watch /health ok. */
export function useWatchEnabled() {
  const flagOn = isWatchFlagEnabled();
  const health = useQuery({
    queryKey: ["watch-health"],
    queryFn: fetchWatchHealth,
    enabled: flagOn,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const enabled = flagOn && health.data?.ok === true && !health.isError;

  return {
    enabled,
    flag: flagOn,
    flagOn,
    healthOk: health.data?.ok === true,
    showWatchNav: enabled,
    isLoading: flagOn && health.isLoading,
    health,
  };
}
