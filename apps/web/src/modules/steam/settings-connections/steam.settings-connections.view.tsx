"use client";

import Link from "next/link";
import type { SourceDomain } from "@questorylabs/shared";
import { SteamSyncStatus } from "@/components/SteamSyncStatus";
import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonText,
} from "@questorylabs/ui";
import { steamLinkUrl } from "@/lib/auth-api";
import { SettingsHeader } from "../settings-shared/SettingsHeader";
import { SyncNowButton } from "../settings-shared/SyncNowButton";
import { ConnectionModuleCard } from "./components/ConnectionModuleCard";
import { QmonitorDevicesPanel } from "./components/QmonitorDevicesPanel";
import {
  CONNECTION_MODULES,
  GAMES_MODULE,
} from "./steam.settings-connections.constants";
import type { ConnectionsViewProps } from "./steam.settings-connections.types";
import { countOn, domainPills, gamesPills } from "./steam.settings-connections.utils";

export const ConnectionsView = (props: Record<string, unknown>) => {
  const {
    justLinked,
    linkError,
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
  } = props as ConnectionsViewProps;

  const games = gamesPills({
    steamConnected,
    qmonitorDeviceCount: connections.value?.qmonitorDeviceCount,
  });
  const domains = (
    [
      ["music", showMusic],
      ["watch", showWatch],
      ["read", showRead],
    ] as [SourceDomain, boolean][]
  )
    .filter(([, show]) => show)
    .map(([domain]) => {
      const data = sources.value?.domains.find((d) => d.domain === domain);
      return { domain, data, pills: domainPills(data) };
    });
  const linkedCount =
    countOn(games) + domains.reduce((sum, d) => sum + countOn(d.pills), 0);

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-3.5">
      <SettingsHeader
        active="connections"
        title={
          <>
            {linkedCount} source{linkedCount === 1 ? "" : "s"},{" "}
            <span className="font-serif text-[#bdbdc2]">read-only</span>
          </>
        }
        description="Each module needs at least one connection. Sign-in stays email and password; these only read your data."
      />

      {justLinked ? (
        <p className="px-1 text-sm text-[var(--accent)]">
          Steam linked — syncing your library in the background.
        </p>
      ) : null}
      {linkError ? (
        <p className="px-1 text-sm text-[var(--danger)]" role="alert">
          Could not link: {linkError}
        </p>
      ) : null}

      {steamConnected ? (
        <SteamSyncStatus
          variant="panel"
          forceVisible={justLinked}
          enabled={steamConnected}
        />
      ) : null}

      <ul className="flex flex-col gap-3">
        <ConnectionModuleCard
          name={GAMES_MODULE.name}
          color={GAMES_MODULE.color}
          tint={GAMES_MODULE.tint}
          index={1}
          summary={
            steamConnected
              ? sync.active
                ? "Steam linked · syncing"
                : "Steam linked"
              : "Steam not linked"
          }
          summaryTone={steamConnected ? "ok" : "warn"}
          live={steamConnected && sync.active}
          manageHref="/settings/stores"
          pills={games}
        >
          <p className="max-w-xl text-sm text-[var(--muted)]">
            Link Steam to sync library, wishlist, friends, and prices. This
            does not replace email login.
          </p>
          {steamConnected ? (
            <ResourceStatus
              failed={stores.failed}
              empty={stores.empty}
              loading={<SkeletonText lines={1} className="mt-2 max-w-xs" />}
              error={
                <EmptyState
                  size="sm"
                  className="mt-2"
                  title={
                    <span className="text-[var(--danger)]">
                      Could not load store status.
                    </span>
                  }
                />
              }
            >
              <p className="mt-2 font-mono text-xs text-[var(--faint)]">
                Linked · {user?.steamId}
                {steamStatus?.displayName
                  ? ` · ${steamStatus.displayName}`
                  : ""}
              </p>
            </ResourceStatus>
          ) : null}
          <div className="mt-3 flex flex-wrap items-start gap-2">
            {steamConnected ? (
              <>
                <span className="pill text-sm text-[var(--muted)]">
                  {sync.active ? "Connected · syncing" : "Connected"}
                </span>
                <SyncNowButton />
              </>
            ) : (
              <a href={steamLinkUrl()} className="inline-block">
                <Button type="button">Link Steam</Button>
              </a>
            )}
          </div>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Epic &amp; GOG account linking is coming later. Store tags already
            work in library filters.{" "}
            <Link
              href="/settings/stores"
              className="text-[var(--accent)] hover:underline"
            >
              View store status
            </Link>
          </p>
        </ConnectionModuleCard>

        {domains.map(({ domain, data, pills }, i) => {
          const mod = CONNECTION_MODULES[domain];
          const connected = data?.connected ?? 0;
          return (
            <ConnectionModuleCard
              key={domain}
              name={mod.name}
              color={mod.color}
              tint={mod.tint}
              index={i + 2}
              summary={
                sources.failed
                  ? "Status unavailable"
                  : data
                    ? `${connected} of ${data.providers.length} connected`
                    : "Loading…"
              }
              summaryTone={connected > 0 ? "ok" : sources.failed || !data ? "muted" : "warn"}
              manageHref={`/sources?tab=${domain}`}
              pills={pills}
            >
              <p className="max-w-xl text-sm text-[var(--muted)]">{mod.description}</p>
            </ConnectionModuleCard>
          );
        })}
      </ul>

      <QmonitorDevicesPanel
        devices={devices}
        revokeDevice={revokeDevice}
        revokeError={revokeError}
        index={domains.length + 2}
      />
    </div>
  );
};
