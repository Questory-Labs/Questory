"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { StoreBadge } from "@/components/StoreBadge";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { steamLinkUrl } from "@/lib/auth-api";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import type { StoreAccountStatus } from "@questorylabs/shared";

type MeResponse = {
  user: {
    id: string;
    steamId: string | null;
    email?: string | null;
    personaName: string;
  } | null;
};

function ConnectionsContent() {
  const params = useSearchParams();
  const linked = params.get("linked");
  const error = params.get("error");
  const music = useMusicEnabled();
  const watch = useWatchEnabled();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
  });
  const stores = useQuery({
    queryKey: ["stores"],
    queryFn: () => api<StoreAccountStatus[]>("/stores"),
  });

  const steamConnected = Boolean(me.data?.user?.steamId);
  const steamStatus = stores.data?.find((s) => s.store === "steam");

  return (
    <>
      <PageHeader
        title="Connections"
        description="Link Steam and other services to your account. Sign-in stays email and password only."
      />

      {linked === "steam" ? (
        <p className="mb-4 text-sm text-[var(--accent)]">Steam linked successfully.</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-[var(--danger)]" role="alert">
          Could not link: {error}
        </p>
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
                <p className="mt-2 font-mono text-xs text-[var(--faint)]">
                  Linked · {me.data?.user?.steamId}
                  {steamStatus?.displayName
                    ? ` · ${steamStatus.displayName}`
                    : ""}
                </p>
              ) : null}
            </div>
            <StoreBadge store="steam" />
          </div>
          <div className="mt-4">
            {steamConnected ? (
              <span className="border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]">
                Connected
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

        {watch.enabled ? (
          <Panel className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Watch
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
              Trakt, AniList, Letterboxd
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Connect OAuth sources and import Letterboxd exports from Watch
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

        {music.showMusicNav ? (
          <Panel className="p-5">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Music
            </div>
            <h2 className="mt-1 font-display text-xl font-bold tracking-tight">
              ListenBrainz &amp; imports
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Ingest tokens and Spotify / Last.fm / Koito imports live under Music
              sources. Spotify OAuth linking is not available yet.
            </p>
            <Link
              href="/music/settings"
              className="mt-3 inline-block text-sm text-[var(--accent)] hover:underline"
            >
              Open Music sources
            </Link>
          </Panel>
        ) : null}
      </section>
    </>
  );
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--muted)]">Loading…</p>}>
      <ConnectionsContent />
    </Suspense>
  );
}
