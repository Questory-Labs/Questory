"use client";

import { Panel } from "@questorylabs/ui";
import { SketchDonut } from "@/components/charts/SketchDonut";
import { libraryPlayMix } from "@/lib/partition-mix";
import type { DashboardStats } from "@questorylabs/shared";

export const LibraryMix = ({ value }: { value: DashboardStats }) => {
  if (value.librarySize <= 0) return null;
  const unplayed = Math.max(0, Math.min(value.unplayedCount, value.librarySize));
  const played = value.librarySize - unplayed;
  const playedPct = Math.round((played / value.librarySize) * 100);
  const mix = libraryPlayMix(value.librarySize, value.unplayedCount);

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-bold tracking-tight">Library mix</h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        {played.toLocaleString()} launched · {unplayed.toLocaleString()} never
        played
      </p>
      <Panel size="lg" className="mt-3 w-fit max-w-full p-4">
        <SketchDonut
          data={mix}
          ariaLabel="Library played versus unplayed"
          center={`${playedPct}%`}
          centerCaption="played"
        />
      </Panel>
    </section>
  );
};
