"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { fetchReadHealth, isReadFlagEnabled } from "@/lib/read";

/** Read menus/routes: feature flag ON and API /health read.enabled. */
export function useReadEnabled() {
  const flagOn = isReadFlagEnabled();
  const health = useQuery({
    queryKey: ["read-health"],
    queryFn: fetchReadHealth,
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
    showReadNav: enabled,
    isLoading: flagOn && health.isLoading,
    health,
  };
}
