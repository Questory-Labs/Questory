"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type EnterpriseStatus = {
  available: boolean;
  engine?: { ok: boolean; ready?: boolean; model?: string };
};

/**
 * Enterprise gate: the private API extension answers /v1/enterprise/status;
 * a community API 404s, which we treat as disabled. No env flag needed —
 * presence of the extension is the switch.
 */
export function useEnterpriseEnabled() {
  const status = useQuery({
    queryKey: ["enterprise-status"],
    queryFn: () => api<EnterpriseStatus>("/enterprise/status"),
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: true,
  });

  const available = status.data?.available === true && !status.isError;

  return {
    /** Extension is loaded in the API (nav + route gate). */
    enabled: available,
    /** Rust engine reachable behind the extension. */
    engineOk: available && status.data?.engine?.ok === true,
    isLoading: status.isLoading,
    status,
  };
}
