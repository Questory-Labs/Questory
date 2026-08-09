"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { fetchWatchHealth, isWatchFlagEnabled } from "@/lib/watch";

/** Watch menus/routes: feature flag ON and watch /health ok. */
export function useWatchEnabled() {
  const flagOn = isWatchFlagEnabled();
  const health = useResource({
    id: ["watch-health"],
    load: fetchWatchHealth,
    when: flagOn,
    freshFor: 30_000,
    retries: false,
    refreshOnFocus: true,
  });

  const enabled = flagOn && health.value?.ok === true && !health.failed;

  return {
    enabled,
    flag: flagOn,
    flagOn,
    healthOk: health.value?.ok === true,
    showWatchNav: enabled,
    isLoading: flagOn && health.empty && health.busy,
    health,
  };
}
