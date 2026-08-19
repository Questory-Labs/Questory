"use client";

import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useUser } from "@/hooks/useUser";
import { api } from "@/lib/api";
import { useResource, UseResourceResult } from "@questorylabs/qhttp/react";
import { DashboardStats, PlayNextItem } from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren } from "react";

export const DashboardController = ({ children }: PropsWithChildren) => {
  const { user } = useUser();

  const stats = useResource({
    id: ["dashboard"],
    load: () => api<DashboardStats>("/dashboard/stats"),
  });

  const playNext = useResource({
    id: ["play-next"],
    load: () => api<PlayNextItem[]>("/dashboard/play-next"),
  });

  const steamConnected = Boolean(user?.steamId);

  const sync = useSyncJobs({ enabled: steamConnected });

  const { value } = stats as UseResourceResult<DashboardStats> ?? {};
  const { recentlyPlayed } = value ?? {};
  const { value: nextUpValue } = playNext as UseResourceResult<PlayNextItem[]> ?? {};
  
  return cloneElements(children, {
    recentlyPlayed,
    nextUp: nextUpValue ?? [],
    stats,
    playNext,
    sync,
  });
};