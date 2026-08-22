"use client";

import Link from "next/link";
import { StoreBadge } from "@/components/StoreBadge";
import { SteamSyncStatus } from "@/components/SteamSyncStatus";
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonText,
} from "@questorylabs/ui";
import { steamLinkUrl } from "@/lib/auth-api";
import type { ConnectionsViewProps } from "./steam.settings-connections.types";

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
  } = props as ConnectionsViewProps;

  return (
    <>
      <PageHeader
        title="Connections"
        description="Link Steam and other services to your account. Sign-in stays email and password only."
      />

      {justLinked ? (
        <p className="mb-4 text-sm text-[var(--accent)]">
          Steam linked — syncing your library in the background.
        </p>
      ) : null}
      {linkError ? (
        <p className="mb-4 text-sm text-[var(--danger)]" role="alert">
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

      <section className="space-y-4">
        <Panel className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                Games
              </div>
              <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
                Steam
              </h2>
              <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">
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
            </div>
            <StoreBadge store="steam" />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {steamConnected ? (
              <span className="border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]">
                {sync.active ? "Connected · syncing" : "Connected"}
              </span>
            ) : (
              <a href={steamLinkUrl()} className="inline-block">
                <Button type="button">Link Steam</Button>
              </a>
            )}
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
            Stores
          </div>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
            Epic &amp; GOG
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Account linking is coming later. Store tags already work in library
            filters.
          </p>
          <Link
            href="/settings/stores"
            className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
          >
            View store status
          </Link>
        </Panel>

        {showWatch ? (
          <Panel className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Watch
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
              Trakt, AniList, Letterboxd
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Connect live sources and enrich with Letterboxd history from Watch
              settings.
            </p>
            <Link
              href="/watch/settings"
              className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Open Watch sources
            </Link>
          </Panel>
        ) : null}

        {showMusic ? (
          <Panel className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Music
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
              ListenBrainz &amp; imports
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Set up live multi-scrobbler ingest and enrich with Spotify / Last.fm
              / Koito history under Music sources. Spotify OAuth linking is not
              available yet.
            </p>
            <Link
              href="/music/settings"
              className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Open Music sources
            </Link>
          </Panel>
        ) : null}

        {showRead ? (
          <Panel className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Read
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
              AniList manga
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Sync manga, manhwa, and novels from AniList into Read analytics.
              Shares the same AniList connection as Watch anime.
            </p>
            <Link
              href="/read/settings"
              className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Open Read sources
            </Link>
          </Panel>
        ) : null}
      </section>
    </>
  );
};
