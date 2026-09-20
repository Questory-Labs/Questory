"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useResource, type UseResourceResult } from "@questorylabs/qhttp/react";
import type { AppStatus, SourceFlags } from "@questorylabs/shared";
import {
  APP_STATUS_RESOURCE_ID,
  defaultSourceFlags,
  fetchAppStatus,
} from "@/lib/app-status";

export type MusicEnabledValue = {
  flagOn: boolean;
  healthOk: boolean;
  showMusicNav: boolean;
  isLoading: boolean;
  failed: boolean;
};

export type WatchEnabledValue = {
  enabled: boolean;
  flag: boolean;
  flagOn: boolean;
  healthOk: boolean;
  showWatchNav: boolean;
  isLoading: boolean;
  failed: boolean;
};

export type ReadEnabledValue = {
  enabled: boolean;
  flag: boolean;
  flagOn: boolean;
  healthOk: boolean;
  showReadNav: boolean;
  isLoading: boolean;
  failed: boolean;
};

export type StatusValue = {
  music: MusicEnabledValue;
  watch: WatchEnabledValue;
  read: ReadEnabledValue;
  sources: SourceFlags;
  isLoading: boolean;
  failed: boolean;
  status: UseResourceResult<AppStatus>;
};

const StatusContext = createContext<StatusValue | null>(null);

const DropEpochContext = createContext({
  epoch: 0,
  bump: () => undefined as void,
});

/** Bump after store.drop() so GET /v1/status loads again (useResource will not re-ensure). */
export function DropEpochProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0);
  const bump = useCallback(() => setEpoch((n) => n + 1), []);
  const value = useMemo(() => ({ epoch, bump }), [epoch, bump]);
  return (
    <DropEpochContext.Provider value={value}>{children}</DropEpochContext.Provider>
  );
}

export function useDropEpochBump() {
  return useContext(DropEpochContext).bump;
}

/** Mount once under ResourceProvider; domain hooks read from this context. */
export function StatusProvider({ children }: { children: ReactNode }) {
  const { epoch } = useContext(DropEpochContext);
  return <StatusProviderInner key={epoch}>{children}</StatusProviderInner>;
}

function StatusProviderInner({ children }: { children: ReactNode }) {
  const status = useResource({
    id: [...APP_STATUS_RESOURCE_ID],
    load: fetchAppStatus,
    freshFor: Number.POSITIVE_INFINITY,
    retries: false,
    // qHttp only refreshes on focus when this resource last failed.
    refreshOnFocus: true,
  });

  const loaded = !status.empty && !status.failed;
  const musicOn = loaded && status.value?.music.enabled === true;
  const watchOn = loaded && status.value?.watch.enabled === true;
  const readOn = loaded && status.value?.read.enabled === true;
  const isLoading = status.empty && (status.busy || !status.failed);

  const sources = status.value?.sources ?? defaultSourceFlags();

  const value = useMemo((): StatusValue => {
    const music: MusicEnabledValue = {
      flagOn: musicOn,
      healthOk: musicOn,
      showMusicNav: musicOn,
      isLoading,
      failed: status.failed,
    };
    const watch: WatchEnabledValue = {
      enabled: watchOn,
      flag: watchOn,
      flagOn: watchOn,
      healthOk: watchOn,
      showWatchNav: watchOn,
      isLoading,
      failed: status.failed,
    };
    const read: ReadEnabledValue = {
      enabled: readOn,
      flag: readOn,
      flagOn: readOn,
      healthOk: readOn,
      showReadNav: readOn,
      isLoading,
      failed: status.failed,
    };
    return {
      music,
      watch,
      read,
      sources,
      isLoading,
      failed: status.failed,
      status,
    };
  }, [musicOn, watchOn, readOn, isLoading, sources, status]);

  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) {
    throw new Error("useStatus must be used within StatusProvider");
  }
  return ctx;
}

export function useMusicEnabled() {
  return useStatus().music;
}

export function useWatchEnabled() {
  return useStatus().watch;
}

export function useReadEnabled() {
  return useStatus().read;
}

export function useFeatureSources() {
  return useStatus().sources;
}
