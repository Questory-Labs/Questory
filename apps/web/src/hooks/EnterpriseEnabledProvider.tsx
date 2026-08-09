"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useResource, type UseResourceResult } from "@questorylabs/qhttp/react";
import { fetchEnterpriseStatus } from "@/lib/enterprise-api";
import { isEnterpriseFlagEnabled } from "@/lib/enterprise";

type EnterpriseStatusData = Awaited<ReturnType<typeof fetchEnterpriseStatus>>;

export type EnterpriseEnabledValue = {
  /** Flag on and QEngine answered available. */
  enabled: boolean;
  /** Alias for enabled */
  when: boolean;
  /** Service healthy behind the status payload. */
  serviceOk: boolean;
  /** @deprecated use serviceOk */
  engineOk: boolean;
  flagOn: boolean;
  isLoading: boolean;
  status: UseResourceResult<EnterpriseStatusData>;
};

const EnterpriseEnabledContext = createContext<EnterpriseEnabledValue | null>(
  null,
);

function useEnterpriseEnabledState(): EnterpriseEnabledValue {
  const flagOn = isEnterpriseFlagEnabled();
  const status = useResource({
    id: ["enterprise-status"],
    load: fetchEnterpriseStatus,
    when: flagOn,
    freshFor: 30_000,
    retries: false,
    refreshOnFocus: true,
  });

  const available =
    flagOn && status.value?.available === true && !status.failed;

  return useMemo(
    () => ({
      enabled: available,
      when: available,
      serviceOk: available && status.value?.service?.ok === true,
      engineOk: available && status.value?.service?.ok === true,
      flagOn,
      isLoading: flagOn && status.empty,
      status,
    }),
    [available, flagOn, status],
  );
}

/** Mount once under ResourceProvider; consumers use useEnterpriseEnabled(). */
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
