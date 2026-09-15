"use client";

import Link from "next/link";
import type { PlaySessionStats } from "@questorylabs/shared";
import { SketchChartPanel } from "@/components/charts/SketchChartPanel";
import { Sparkline } from "@/components/charts/Sparkline";
import { GameCover } from "@/components/GameCover";
import { StatCard } from "@/components/StatCard";
import { Panel } from "@questorylabs/ui";
import { formatRelativePlayed } from "@/lib/dates";
import {
  formatDayAxisLabel,
  formatHoursTick,
  formatSessionDuration,
} from "./session-format";

export const SessionsOverview = ({ stats }: { stats: PlaySessionStats }) => {
  const spark = stats.byDay.map((d) => d.durationSecs);
  const chartData = stats.byDay.map((d) => ({
    label: d.day,
    count: d.durationSecs / 3600,
  }));
  const topMax = Math.max(...stats.topGames.map((g) => g.durationSecs), 1);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Played"
          value={formatSessionDuration(stats.totalDurationSecs)}
          hint={
            stats.lastPlayedAt
              ? `Last session ${formatRelativePlayed(stats.lastPlayedAt)}`
              : "All completed qMonitor sessions"
          }
        />
        <StatCard
          label="Sessions"
          value={stats.sessionCount.toLocaleString()}
          hint={
            stats.avgDurationSecs > 0
              ? `Avg ${formatSessionDuration(stats.avgDurationSecs)} · ${stats.uniqueGames.toLocaleString()} linked`
              : `${stats.uniqueGames.toLocaleString()} linked games`
          }
        />
        <StatCard
          label={`Last ${stats.weekDays} days`}
          value={formatSessionDuration(stats.weekDurationSecs)}
          hint={`${stats.weekSessionCount.toLocaleString()} session${stats.weekSessionCount === 1 ? "" : "s"}`}
          sparkline={
            spark.length > 1 ? (
              <Sparkline
                data={spark}
                ariaLabel={`Playtime over ${stats.windowDays} days`}
              />
            ) : undefined
          }
        />
        <StatCard
          label="Unmatched"
          value={stats.unmatchedCount.toLocaleString()}
          hint={
            stats.unmatchedCount === 0
              ? "All sessions linked"
              : "Assign to a library game"
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <SketchChartPanel
          title={`Last ${stats.windowDays} days`}
          data={chartData}
          valueLabel="playtime"
          emptyMessage="No playtime in this window."
          ariaLabel="Playtime by day"
          size="md"
          variant="bar"
          formatXLabel={formatDayAxisLabel}
          formatValue={formatHoursTick}
          formatYTick={formatHoursTick}
        />
        <Panel className="p-4">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Top games
          </h2>
          {stats.topGames.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No play in this window.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {stats.topGames.map((game) => {
                const pct = Math.max(
                  8,
                  Math.round((game.durationSecs / topMax) * 100),
                );
                const name = (
                  <span className="min-w-0 truncate text-sm font-medium">
                    {game.name}
                  </span>
                );
                return (
                  <li key={game.key} className="flex items-center gap-3">
                    <GameCover
                      src={game.headerImage}
                      className="w-16 shrink-0"
                      fallback="—"
                    />
                    <div className="min-w-0 flex-1">
                      {game.gameId ? (
                        <Link
                          href={`/library/${game.gameId}`}
                          className="flex min-w-0 hover:text-[var(--accent)]"
                        >
                          {name}
                        </Link>
                      ) : (
                        name
                      )}
                      <div
                        className="mt-1.5 h-1 overflow-hidden bg-[var(--line)]"
                        aria-hidden
                      >
                        <div
                          className="h-full bg-[var(--accent)]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)]">
                      {formatSessionDuration(game.durationSecs)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
};
