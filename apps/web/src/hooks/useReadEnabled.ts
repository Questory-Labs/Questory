"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { fetchReadHealth, isReadFlagEnabled } from "@/lib/read";

/** Read menus/routes: feature flag ON and API /health read.enabled. */
export function useReadEnabled() {
  const flagOn = isReadFlagEnabled();
  const health = useResource({
    id: ["read-health"],
    load: fetchReadHealth,
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
    showReadNav: enabled,
    isLoading: flagOn && health.empty && health.busy,
    health,
  };
}
