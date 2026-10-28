"use client";

import { useResource } from "@questorylabs/qhttp/react";
import type { NavCounts } from "@questorylabs/shared";
import { api } from "@/lib/api";

export const NAV_COUNTS_FRESH_MS = 60_000;

export function useNavCounts(opts?: { enabled?: boolean }) {
  return useResource({
    id: ["nav-counts"],
    load: () => api<NavCounts>("/shell/nav-counts"),
    when: opts?.enabled ?? true,
    freshFor: NAV_COUNTS_FRESH_MS,
  });
}
