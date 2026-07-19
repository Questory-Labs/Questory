"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import {
  GameDetailStats,
  SectionTitle,
} from "@/components/GameDetailStats";
import { StoreBadge, StoreBadgeRow } from "@/components/StoreBadge";
import { Panel, StateMessage } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import type { GameDetail, Store } from "@questorylabs/shared";

type LibraryEntryDetail = {
  id: string;
  playtimeForever: number;
  stores?: Store[];
  ownerships?: Array<{
    store: Store;
    playtimeForever: number;
    listing?: {
      storeUrl?: string | null;
      currentPrice?: number | null;
      externalId: string;
    } | null;
  }>;
  game: {
    id: string;
    appId: number | null;
    name: string;
    headerImage: string | null;
    genres: string[];
    categories: string[];
    tags: string[];
    currentPrice: number | null;
    deckStatus: string | null;
    stores?: Store[];
    listings?: Array<{
      store: Store;
      storeUrl: string | null;
      currentPrice: number | null;
      externalId: string;
    }>;
  };
};

export default function LibraryGamePage() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  const entry = useQuery({
    queryKey: ["library-entry", gameId],
    queryFn: () => api<LibraryEntryDetail>(`/library/${gameId}`),
    enabled: Boolean(gameId),
  });

  const appId = entry.data?.game.appId;
  const detail = useQuery({
    queryKey: ["game-detail", appId],
    queryFn: () => api<GameDetail>(`/games/${appId}`),
    enabled: appId != null && appId > 0,
  });

  const e = entry.data;
  const d = detail.data;
  const currency = d?.price.currency || "USD";
  const stores = e?.stores || e?.game.stores || [];
  const name = e?.game.name || d?.name || gameId;
  const hasSteam = stores.includes("steam") || (appId != null && appId > 0);

  return (
    <AppShell>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        <Link href="/library" className="hover:text-[var(--accent)]">
          Library
        </Link>
        {" / "}
        {name}
      </p>

      {(entry.isLoading || (appId && detail.isLoading)) && (
        <StateMessage variant="loading">Loading game…</StateMessage>
      )}
      {entry.isError && (
        <StateMessage variant="error">Could not load this game.</StateMessage>
      )}

      {e && (
        <>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <Panel className="overflow-hidden">
              {e.game.headerImage || d?.headerImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.game.headerImage || d?.headerImage || ""}
                  alt=""
                  className="aspect-[460/215] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[460/215] items-center justify-center bg-[var(--bg-2)] text-sm text-[var(--faint)]">
                  No art
                </div>
              )}
            </Panel>
            <div>
              <div className="mb-2">
                <StoreBadgeRow stores={stores} />
              </div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                {name}
              </h1>
              <p className="mt-3 text-sm text-[var(--muted)]">
                {(e.game.genres.length
                  ? e.game.genres
                  : d?.genres || []
                )
                  .slice(0, 4)
                  .join(" · ") || "No genres yet"}
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <Panel className="p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    Your playtime
                  </div>
                  <div className="mt-1 text-lg">
                    {Math.round((e.playtimeForever / 60) * 10) / 10}h
                  </div>
                </Panel>
                <Panel className="p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    Store estimate
                  </div>
                  <div className="mt-1 text-lg">
                    {d?.price.current != null
                      ? formatMoney(d.price.current, currency)
                      : e.game.currentPrice != null
                        ? formatMoney(e.game.currentPrice, currency)
                        : "—"}
                  </div>
                </Panel>
                {d?.review && (
                  <Panel className="p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      Reviews
                    </div>
                    <div className="mt-1 text-lg">
                      {d.review.score != null ? `${d.review.score}%` : "—"}
                    </div>
                  </Panel>
                )}
                {d?.hltb && (
                  <Panel className="p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      HLTB main
                    </div>
                    <div className="mt-1 text-lg">
                      {d.hltb.mainHours != null
                        ? `${d.hltb.mainHours}h`
                        : "—"}
                    </div>
                  </Panel>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {hasSteam && appId != null && appId > 0 && (
                  <>
                    <a
                      href={`steam://run/${appId}`}
                      className="btn btn-primary"
                    >
                      Play
                    </a>
                    <a
                      href={`https://store.steampowered.com/app/${appId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                    >
                      Open on Steam →
                    </a>
                  </>
                )}
                {(e.ownerships || []).map((o) => {
                  if (o.store === "steam") return null;
                  const url =
                    o.listing?.storeUrl ||
                    e.game.listings?.find((l) => l.store === o.store)
                      ?.storeUrl;
                  if (!url) return null;
                  return (
                    <a
                      key={o.store}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary gap-2 text-[var(--accent)]"
                    >
                      <StoreBadge store={o.store} compact />
                      Open store →
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {e.ownerships && e.ownerships.length > 1 && (
            <section className="mt-10">
              <h2 className="mb-3 font-display text-xl font-bold">Owned on</h2>
              <ul className="divide-y divide-[var(--line)] panel-outline">
                {e.ownerships.map((o) => (
                  <li
                    key={o.store}
                    className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <StoreBadge store={o.store} />
                    <span className="font-mono text-xs text-[var(--muted)]">
                      {Math.round((o.playtimeForever / 60) * 10) / 10}h
                      {o.listing?.currentPrice != null
                        ? ` · ${formatMoney(o.listing.currentPrice, currency)}`
                        : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {detail.isError && (
            <StateMessage variant="error">
              Could not load enriched game stats.
            </StateMessage>
          )}

          {d && (
            <section className="mt-10">
              <h2 className="mb-6 font-display text-xl font-bold">
                Game details
              </h2>
              <div className="max-w-4xl">
                <GameDetailStats
                  detail={d}
                  showActions={false}
                  linkFriends
                  friendLimit={24}
                  chartSize="lg"
                  className="space-y-8"
                  beforeFriends={
                    e.ownerships && e.ownerships.length === 1 ? (
                      <section>
                        <SectionTitle>Your library</SectionTitle>
                        <p className="text-sm text-[var(--muted)]">
                          {Math.round((e.playtimeForever / 60) * 10) / 10}h
                          played
                          {stores.length
                            ? ` · owned on ${stores.join(", ")}`
                            : ""}
                        </p>
                      </section>
                    ) : null
                  }
                />
              </div>
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
