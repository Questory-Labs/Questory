"use client";

import { useState, type PropsWithChildren } from "react";
import { useSearchParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  ConnectionsOverview,
  QmonitorDeviceList,
  SourcesOverview,
  StoreAccountStatus,
} from "@questorylabs/shared";
import { api } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useSyncJobs } from "@/hooks/useSyncJobs";
import { useUser } from "@/hooks/useUser";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";

export const ConnectionsController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const params = useSearchParams();
  const linked = params.get("linked");
  const error = params.get("error");
  const music = useMusicEnabled();
  const watch = useWatchEnabled();
  const read = useReadEnabled();
  const { user } = useUser();
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const stores = useResource({
    id: ["stores"],
    load: () => api<StoreAccountStatus[]>("/stores"),
  });

  const connections = useResource({
    id: ["connections"],
    load: () => api<ConnectionsOverview>("/connections"),
  });

  const showMusic = music.showMusicNav;
  const showWatch = watch.enabled;
  const showRead = read.showReadNav;

  const sources = useResource({
    id: ["sources-overview"],
    load: () => api<SourcesOverview>("/sources"),
    when: showMusic || showWatch || showRead,
  });

  const devices = useResource({
    id: ["qmonitor-devices"],
    load: () => api<QmonitorDeviceList>("/qmonitor/devices"),
  });

  const revokeDevice = useAction({
    run: (id: string) =>
      api<unknown>(`/qmonitor/devices/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      setRevokeError(null);
      void store.touch(["qmonitor-devices"]);
      void store.touch(["connections"]);
    },
    onError: (err: Error) =>
      setRevokeError(parseApiError(err).message || "Could not revoke device."),
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
    showMusic,
    showWatch,
    showRead,
    connections,
    sources,
    devices,
    revokeDevice,
    revokeError,
  });
};
