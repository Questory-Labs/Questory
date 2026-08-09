"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { fetchMusicHealth, isMusicFlagEnabled } from "@/lib/music";

/** Music menus/routes: feature flag ON and music /health ok. */
export function useMusicEnabled() {
  const flagOn = isMusicFlagEnabled();
  const health = useResource({
    id: ["music-health"],
    load: fetchMusicHealth,
    when: flagOn,
    freshFor: 30_000,
    retries: 1,
    refreshOnFocus: true,
  });

  const showMusicNav = flagOn && health.value?.ok === true && !health.failed;

  return {
    flagOn,
    healthOk: health.value?.ok === true,
    showMusicNav,
    isLoading: flagOn && health.empty && health.busy,
    health,
  };
}
