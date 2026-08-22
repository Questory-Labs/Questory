"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useResource, type UseResourceResult } from "@questorylabs/qhttp/react";
import type { MusicHealth, WatchHealth } from "@questorylabs/shared";
import { fetchMusicHealth, isMusicFlagEnabled } from "@/lib/music";
import { fetchWatchHealth, isWatchFlagEnabled } from "@/lib/watch";
import { fetchReadHealth, isReadFlagEnabled } from "@/lib/read";

type ReadHealth = { ok: boolean };

export type MusicEnabledValue = {
  flagOn: boolean;
  healthOk: boolean;
  showMusicNav: boolean;
  isLoading: boolean;
  health: UseResourceResult<MusicHealth>;
};

export type WatchEnabledValue = {
  enabled: boolean;
  flag: boolean;
  flagOn: boolean;
  healthOk: boolean;
  showWatchNav: boolean;
  isLoading: boolean;
  health: UseResourceResult<WatchHealth>;
};

export type ReadEnabledValue = {
  enabled: boolean;
  flag: boolean;
  flagOn: boolean;
  healthOk: boolean;
  showReadNav: boolean;
  isLoading: boolean;
  health: UseResourceResult<ReadHealth>;
};

export type StatusValue = {
  music: MusicEnabledValue;
  watch: WatchEnabledValue;
  read: ReadEnabledValue;
};

const StatusContext = createContext<StatusValue | null>(null);

function useMusicEnabledState(): MusicEnabledValue {
  const flagOn = isMusicFlagEnabled();
  const health = useResource({
    id: ["music-health"],
    load: fetchMusicHealth,
    when: flagOn,
    freshFor: 30_000,
    retries: false,
    refreshOnFocus: true,
  });

  const showMusicNav = flagOn && health.value?.ok === true && !health.failed;

  return useMemo(
    () => ({
      flagOn,
      healthOk: health.value?.ok === true,
      showMusicNav,
      isLoading: flagOn && health.empty && health.busy,
      health,
    }),
    [flagOn, health, showMusicNav],
  );
}

function useWatchEnabledState(): WatchEnabledValue {
  const flagOn = isWatchFlagEnabled();
  const health = useResource({
    id: ["watch-health"],
    load: fetchWatchHealth,
    when: flagOn,
    freshFor: 30_000,
    retries: false,
    refreshOnFocus: true,
  });

  const enabled = flagOn && health.value?.ok === true && !health.failed;

  return useMemo(
    () => ({
      enabled,
      flag: flagOn,
      flagOn,
      healthOk: health.value?.ok === true,
      showWatchNav: enabled,
      isLoading: flagOn && health.empty && health.busy,
      health,
    }),
    [enabled, flagOn, health],
  );
}

function useReadEnabledState(): ReadEnabledValue {
  const flagOn = isReadFlagEnabled();
  const health = useResource({
    id: ["read-health"],
    load: fetchReadHealth,
    when: flagOn,
    freshFor: 30_000,
    retries: false,
    refreshOnFocus: true,
  });

  const enabled = flagOn && health.value?.ok === true && !health.failed;

  return useMemo(
    () => ({
      enabled,
      flag: flagOn,
      flagOn,
      healthOk: health.value?.ok === true,
      showReadNav: enabled,
      isLoading: flagOn && health.empty && health.busy,
      health,
    }),
    [enabled, flagOn, health],
  );
}

/** Mount once under ResourceProvider; domain hooks read from this context. */
export function StatusProvider({ children }: { children: ReactNode }) {
  const music = useMusicEnabledState();
  const watch = useWatchEnabledState();
  const read = useReadEnabledState();
  const value = useMemo(
    () => ({ music, watch, read }),
    [music, watch, read],
  );
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

/** Music menus/routes: feature flag ON and music /health ok. */
export function useMusicEnabled() {
  return useStatus().music;
}

/** Watch menus/routes: feature flag ON and watch /health ok. */
export function useWatchEnabled() {
  return useStatus().watch;
}

/** Read menus/routes: feature flag ON and API /health read.enabled. */
export function useReadEnabled() {
  return useStatus().read;
}
