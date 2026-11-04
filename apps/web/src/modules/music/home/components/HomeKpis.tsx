"use client";

import type { MusicInsights, MusicOverview, MusicRange } from "@questorylabs/shared";
import { CountUp } from "@questorylabs/ui";
import { Sparkline } from "@/components/charts/Sparkline";
import { formatDeltaPct, formatShare } from "@/lib/music";
import { MusicKpiTile, type KpiTone } from "../../components/MusicKpiTile";
import { RANGE_PREVIOUS } from "../../music.utils";

const deltaTone = (delta: number | null | undefined): KpiTone =>
  delta == null ? "muted" : delta >= 0 ? "ok" : "music";

export const HomeKpis = ({
  range,
  insights,
  overview,
  spark,
}: {
  range: MusicRange;
  insights: MusicInsights;
  overview: MusicOverview | undefined;
  spark: number[];
}) => {
  const previous = RANGE_PREVIOUS[range];
  const versus = (delta: number | null | undefined) =>
    delta != null && previous ? `${formatDeltaPct(delta)} on ${previous}` : undefined;
  const minutesDelta = insights.compare.minutesDeltaPct;
  const hours = insights.listeningMinutes / 60;
  const longest = insights.longestStreakDays;

  return (
    <div className="q-in grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5 [--i:2]">
      <MusicKpiTile
        label="Listens"
        value={<CountUp value={insights.periodListens} />}
        note={versus(insights.compare.deltaPct)}
        tone={deltaTone(insights.compare.deltaPct)}
        aside={
          spark.length > 1 ? <Sparkline data={spark} ariaLabel="Listens by day" /> : undefined
        }
      />
      <MusicKpiTile
        label="Listening time"
        value={<CountUp value={hours} decimals={hours >= 100 ? 0 : 1} dimDecimals />}
        unit=" h"
        note={versus(minutesDelta)}
        tone={deltaTone(minutesDelta)}
      />
      <MusicKpiTile
        label="Artists"
        value={<CountUp value={insights.uniqueArtists} />}
        note={`${insights.newArtists.toLocaleString()} new`}
      />
      <MusicKpiTile
        label="Top genre"
        value={insights.topGenre?.name ?? "—"}
        note={
          insights.topGenre
            ? `${formatShare(insights.topGenre.count, insights.periodListens)} of plays`
            : undefined
        }
      />
      {overview ? (
        <MusicKpiTile
          label="Streak"
          value={<CountUp value={overview.streakDays} />}
          unit=" days"
          note={longest != null ? `Longest ${longest} ${longest === 1 ? "day" : "days"} in range` : undefined}
          tone="music"
        />
      ) : null}
      <MusicKpiTile
        label="Coverage"
        value={<CountUp value={insights.durationCoverage} decimals={1} dimDecimals />}
        unit="%"
        note="listens with duration"
      />
    </div>
  );
};
