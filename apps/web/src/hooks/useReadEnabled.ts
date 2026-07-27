"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchReadHealth, READ_FLAG_ENABLED } from "@/lib/read";

/** Read menus/routes: feature flag ON and API /health read.enabled. */
export function useReadEnabled() {
  const health = useQuery({
    queryKey: ["read-health"],
    queryFn: fetchReadHealth,
    enabled: READ_FLAG_ENABLED,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  const enabled =
    READ_FLAG_ENABLED && health.data?.ok === true && !health.isError;

  return {
    enabled,
    flag: READ_FLAG_ENABLED,
    flagOn: READ_FLAG_ENABLED,
    healthOk: health.data?.ok === true,
    showReadNav: enabled,
    isLoading: READ_FLAG_ENABLED && health.isLoading,
    health,
  };
}
