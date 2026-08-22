"use client";

import type { PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { StoreAccountStatus } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useUser } from "@/hooks/useUser";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";

export const ConnectionsController = ({ children }: PropsWithChildren) => {
  const params = useSearchParams();
  const linked = params.get("linked");
  const error = params.get("error");
  const music = useMusicEnabled();
  const watch = useWatchEnabled();
  const read = useReadEnabled();
  const { user } = useUser();

  const stores = useResource({
    id: ["stores"],
    load: () => api<StoreAccountStatus[]>("/stores"),
  });

  const steamConnected = Boolean(user?.steamId);
  const steamStatus = stores.value?.find((s) => s.store === "steam");
  const justLinked = linked === "steam";
  const sync = useSyncJobs({ enabled: steamConnected });

  return cloneElements(children, {
    justLinked,
    linkError: error,
    stores,
    sync,
    user,
    steamConnected,
    steamStatus,
    showMusic: music.showMusicNav,
    showWatch: watch.enabled,
    showRead: read.showReadNav,
  });
};
