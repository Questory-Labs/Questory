"use client";

import type { PlaySessionStats } from "@questorylabs/shared";
import { HoursPerDayChart } from "./HoursPerDayChart";
import { SessionsKpis } from "./SessionsKpis";
import { TopGamesPanel } from "./TopGamesPanel";

export const SessionsOverview = ({ stats }: { stats: PlaySessionStats }) => (
  <div className="flex flex-col gap-4">
    <SessionsKpis stats={stats} />
    <div className="flex flex-wrap gap-3.5">
      <HoursPerDayChart byDay={stats.byDay} windowDays={stats.windowDays} />
      <TopGamesPanel games={stats.topGames} />
    </div>
  </div>
);
