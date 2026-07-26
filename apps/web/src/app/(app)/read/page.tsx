"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReadOverview, ReadTopItem } from "@questorylabs/shared";
import { StatCard } from "@/components/StatCard";
import { PageHeader, StateMessage } from "@/components/ui";
import { readFetch } from "@/lib/read";

export default function ReadHomePage() {
  const overview = useQuery({
    queryKey: ["read-overview"],
    queryFn: () => readFetch<ReadOverview>("/analytics/overview"),
  });
  const tops = useQuery({
    queryKey: ["read-tops-week"],
    queryFn: () =>
      readFetch<ReadTopItem[]>("/analytics/tops/titles?range=week&limit=10"),
  });

  return (
    <>
      <PageHeader
        title="Read"
        description="Manga, manhwa, and print analytics from AniList. Connect under Read → Sources."
      />

      {overview.isLoading && (
        <StateMessage variant="loading">Loading overview…</StateMessage>
      )}
      {overview.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            ["Titles", overview.data.uniqueTitles],
            ["Chapters", overview.data.chaptersLogged],
            ["In progress", overview.data.inProgress],
            ["Completed %", `${overview.data.completionRate}%`],
            ["Streak (days)", overview.data.streakDays],
            ["Volumes", overview.data.volumesLogged],
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
                  {t.format ? (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                      {t.format}
                    </span>
                  ) : null}
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
