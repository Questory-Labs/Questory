"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { fetchEnterpriseStatus } from "@/lib/enterprise-api";
import { isEnterpriseFlagEnabled } from "@/lib/enterprise";

type EnterpriseStatusData = Awaited<ReturnType<typeof fetchEnterpriseStatus>>;

export type EnterpriseEnabledValue = {
  /** Flag on and QEngine answered available. */
  enabled: boolean;
  /** Service healthy behind the status payload. */
  serviceOk: boolean;
  /** @deprecated use serviceOk */
  engineOk: boolean;
  flagOn: boolean;
  isLoading: boolean;
  status: UseQueryResult<EnterpriseStatusData>;
};

const EnterpriseEnabledContext = createContext<EnterpriseEnabledValue | null>(
  null,
);

function useEnterpriseEnabledState(): EnterpriseEnabledValue {
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

  return useMemo(
    () => ({
      enabled: available,
      serviceOk: available && status.data?.service?.ok === true,
      engineOk: available && status.data?.service?.ok === true,
      flagOn,
      isLoading: flagOn && status.isLoading,
      status,
    }),
    [available, flagOn, status],
  );
}

/** Mount once under QueryClientProvider; consumers use useEnterpriseEnabled(). */
export function EnterpriseEnabledProvider({ children }: { children: ReactNode }) {
  const value = useEnterpriseEnabledState();
  return (
    <EnterpriseEnabledContext.Provider value={value}>
      {children}
    </EnterpriseEnabledContext.Provider>
  );
}

/**
 * QEngine gate: requires ENTERPRISE=true, then GET `/v1/enterprise/status`
 * via the community API (proxied to QEngine).
 */
export function useEnterpriseEnabled() {
  const ctx = useContext(EnterpriseEnabledContext);
  if (!ctx) {
    throw new Error(
      "useEnterpriseEnabled must be used within EnterpriseEnabledProvider",
    );
  }
  return ctx;
}
