"use client";

import { useQuery } from "@tanstack/react-query";
import type { WatchOverview, WatchTopItem } from "@questorylabs/shared";
import { StatCard } from "@/components/StatCard";
import { PageHeader, StateMessage } from "@/components/ui";
import { watchFetch } from "@/lib/watch";

export default function WatchHomePage() {
  const overview = useQuery({
    queryKey: ["watch-overview"],
    queryFn: () => watchFetch<WatchOverview>("/analytics/overview"),
  });
  const tops = useQuery({
    queryKey: ["watch-tops-week"],
    queryFn: () =>
      watchFetch<WatchTopItem[]>("/analytics/tops/titles?range=week&limit=10"),
  });

  return (
    <>
      <PageHeader
        title="Watch"
        description={
          <>
            <p>
              Movie &amp; TV analytics from Trakt, Letterboxd CSV, AniList, and
              local player webhooks. Connect sources under Watch → Sources.
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
              This product uses TMDB and the TMDB APIs but is not endorsed,
              certified, or otherwise approved by TMDB.
            </p>
          </>
        }
      />

      {overview.isLoading && (
        <StateMessage variant="loading">Loading overview…</StateMessage>
      )}
      {overview.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Watches", overview.data.totalWatches],
            ["Titles", overview.data.uniqueTitles],
            ["Minutes", overview.data.totalMinutes],
            ["Streak (days)", overview.data.streakDays],
          ].map(([label, value]) => (
            <StatCard
              key={String(label)}
              label={String(label)}
              value={value as string | number}
            />
          ))}
        </div>
      )}

      {tops.data && tops.data.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl text-[var(--ink)]">This week</h2>
          <ol className="mt-4 space-y-2">
            {tops.data.map((t, i) => (
              <li
                key={t.id}
                className="flex items-baseline justify-between border-b border-[var(--line)] py-2 text-sm"
              >
                <span className="text-[var(--ink)]">
                  <span className="mr-3 font-mono text-[var(--faint)]">
                    {i + 1}.
                  </span>
                  {t.name}
                </span>
                <span className="font-mono text-[var(--muted)]">{t.count}</span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
