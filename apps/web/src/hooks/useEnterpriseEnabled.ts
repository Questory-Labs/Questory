"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEnterpriseStatus } from "@/lib/enterprise-api";
import { isEnterpriseFlagEnabled } from "@/lib/enterprise";

/**
 * QEngine gate: requires ENTERPRISE=true, then GET
 * `{NEXT_PUBLIC_ENTERPRISE_URL}/v1/enterprise/status`.
 */
export function useEnterpriseEnabled() {
  const flagOn = isEnterpriseFlagEnabled();
  const status = useQuery({
    queryKey: ["enterprise-status"],
    queryFn: fetchEnterpriseStatus,
    enabled: flagOn,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const available =
    flagOn && status.data?.available === true && !status.isError;

  return {
    /** Flag on and QEngine answered available. */
    enabled: available,
    /** Service healthy behind the status payload. */
    serviceOk: available && status.data?.service?.ok === true,
    /** @deprecated use serviceOk */
    engineOk: available && status.data?.service?.ok === true,
    flagOn,
    isLoading: flagOn && status.isLoading,
    status,
  };
}
