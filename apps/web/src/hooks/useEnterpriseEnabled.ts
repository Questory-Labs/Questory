"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchEnterpriseStatus } from "@/lib/enterprise-api";
import { ENTERPRISE_FLAG_ENABLED } from "@/lib/enterprise";

/**
 * Enterprise gate: requires ENTERPRISE=true, then GET
 * `{NEXT_PUBLIC_ENTERPRISE_URL}/v1/enterprise/status`.
 */
export function useEnterpriseEnabled() {
  const status = useQuery({
    queryKey: ["enterprise-status"],
    queryFn: fetchEnterpriseStatus,
    enabled: ENTERPRISE_FLAG_ENABLED,
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const available =
    ENTERPRISE_FLAG_ENABLED &&
    status.data?.available === true &&
    !status.isError;

  return {
    /** Flag on and enterprise service answered available. */
    enabled: available,
    /** Service healthy behind the status payload. */
    serviceOk: available && status.data?.service?.ok === true,
    /** @deprecated use serviceOk */
    engineOk: available && status.data?.service?.ok === true,
    flagOn: ENTERPRISE_FLAG_ENABLED,
    isLoading: ENTERPRISE_FLAG_ENABLED && status.isLoading,
    status,
  };
}
