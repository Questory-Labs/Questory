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
        <p className="mt-8 text-sm text-[var(--muted)]">Loading game…</p>
      )}
      {entry.isError && (
        <p className="mt-8 text-sm text-red-400">Could not load this game.</p>
      )}

      {e && (
        <>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div className="overflow-hidden border border-[var(--line)]">
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
            </div>
            <div>
              <div className="mb-2">
                <StoreBadgeRow stores={stores} />
              </div>
              <h1
                className="font-[family-name:var(--font-display)] text-3xl sm:text-4xl"
                style={{ fontWeight: 700 }}
              >
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
                <div className="border border-[var(--line)] bg-[var(--bg-1)] p-3">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    Your playtime
                  </div>
                  <div className="mt-1 text-lg">
                    {Math.round((e.playtimeForever / 60) * 10) / 10}h
                  </div>
                </div>
                <div className="border border-[var(--line)] bg-[var(--bg-1)] p-3">
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
                </div>
                {d?.review && (
                  <div className="border border-[var(--line)] bg-[var(--bg-1)] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      Reviews
                    </div>
                    <div className="mt-1 text-lg">
                      {d.review.score != null ? `${d.review.score}%` : "—"}
                    </div>
                  </div>
                )}
                {d?.hltb && (
                  <div className="border border-[var(--line)] bg-[var(--bg-1)] p-3">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      HLTB main
                    </div>
                    <div className="mt-1 text-lg">
                      {d.hltb.mainHours != null
                        ? `${d.hltb.mainHours}h`
                        : "—"}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {hasSteam && appId != null && appId > 0 && (
                  <>
                    <a
                      href={`steam://run/${appId}`}
                      className="inline-flex items-center justify-center gap-1.5 border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--bg-0)] hover:opacity-90"
                    >
                      Play
                    </a>
                    <a
                      href={`https://store.steampowered.com/app/${appId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1 border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)] hover:border-[var(--accent)]"
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
                      className="inline-flex items-center gap-2 border border-[var(--line)] px-3 py-2 text-sm text-[var(--accent)] hover:border-[var(--accent)]"
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
              <h2
                className="mb-3 text-xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
                Owned on
              </h2>
              <ul className="divide-y divide-[var(--line)] border border-[var(--line)]">
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
            <p className="mt-10 text-sm text-red-400">
              Could not load enriched game stats.
            </p>
          )}

          {d && (
            <section className="mt-10">
              <h2
                className="mb-6 text-xl"
                style={{ fontFamily: "var(--font-display)", fontWeight: 700 }}
              >
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
