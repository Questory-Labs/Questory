"use client";

import { PageHeader, Panel, ResourceStatus } from "@questorylabs/ui";
import { Button, StateMessage } from "@/components/ui";
import { RewindCarousel } from "./components/RewindCarousel";
import { RewindInsightCard } from "./components/RewindInsightCard";
import { CURRENT_YEAR, MONTHS, REWIND_START_YEAR } from "./media.rewind.constants";
import { RewindExtras, RewindNamedList } from "./components/RewindExtras";
import { RewindStatCard } from "./components/RewindStatCard";
import { RewindTopList } from "./components/RewindTopList";
import { RewindAllTiles } from "./components/RewindAllTiles";
import type { RewindViewProps } from "./media.rewind.types";
import { formatAiCards } from "./media.rewind.utils";

const formatHours = (minutes: number): string =>
  minutes >= 60 ? Math.round(minutes / 60).toLocaleString() : (minutes / 60).toFixed(1);

export const RewindView = (props: Record<string, unknown>) => {
  const {
    domain,
    year,
    month,
    setMonth,
    handleYearChange,
    handleRedo,
    enterpriseEnabled,
    statsQuery,
    aiQuery,
    availableMonths,
    hasCompletedMonths,
    period,
    aiGenerationAllowed,
    aiPeriodError,
    forceRedo,
  } = props as RewindViewProps;

  const years = Array.from(
    { length: CURRENT_YEAR - REWIND_START_YEAR + 1 },
    (_, i) => REWIND_START_YEAR + i,
  ).reverse();
  const stats = statsQuery.value;
  const domainTitle =
    domain === "all" ? "Your" : `${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
  const extrasUnit =
    stats?.domain === "music"
      ? "plays"
      : stats?.domain === "watch"
        ? "watches"
        : stats?.domain === "games"
          ? "hours"
          : "sessions";
  const extrasFormat =
    stats?.domain === "games" ? (n: number) => formatHours(n) : undefined;

  return (
    <>
      <PageHeader size="sm"
        title={`${domainTitle} Rewind`}
        description={`Your top insights for ${period}.`}
        actions={
          <div className="flex gap-2 items-center">
            <select
              value={year}
              onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
              className="bg-[var(--bg-1)] border border-[var(--line)] rounded px-2 py-1 text-sm text-[var(--ink)]"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) =>
                setMonth(e.target.value === "all" ? "all" : parseInt(e.target.value, 10))
              }
              disabled={year === CURRENT_YEAR && !hasCompletedMonths}
              className="bg-[var(--bg-1)] border border-[var(--line)] rounded px-2 py-1 text-sm text-[var(--ink)] disabled:opacity-50"
            >
              {year < CURRENT_YEAR ? <option value="all">All Year</option> : null}
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {MONTHS[m - 1]?.label ?? m}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <div className="mt-8 space-y-6">
        {enterpriseEnabled && (
          <div className="pb-8 mb-8 border-b border-[var(--line)]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                </div>
                <h3 className="text-xl font-display font-semibold text-[var(--ink)] tracking-tight">AI Insights</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={handleRedo} disabled={!aiGenerationAllowed || aiQuery.refreshing || forceRedo} className="bg-[var(--surface-2)] hover:bg-[var(--bg-3)] border-[var(--line-strong)] hover:border-[var(--muted)] transition-all shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Regenerate
                </Button>
              </div>
            </div>

            {!hasCompletedMonths && year === CURRENT_YEAR ? (
              <p className="text-sm text-[var(--muted)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8">
                No completed months yet for {year}. Monthly AI rewind will be available after the first month ends.
              </p>
            ) : !aiGenerationAllowed ? (
              <p className="text-sm text-[var(--muted)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8">
                {aiPeriodError ?? "AI rewind is not available for this period."}
              </p>
            ) : (
              <ResourceStatus
                failed={aiQuery.failed}
                empty={aiQuery.empty}
                loading={
                  <div className="h-48 flex items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
                      <div className="text-[var(--muted)] font-medium text-sm">Synthesizing insights...</div>
                    </div>
                  </div>
                }
                error={
                  <StateMessage variant="error">
                    {aiQuery.error?.message || "Failed to load narrative"}
                  </StateMessage>
                }
              >
                <RewindCarousel key={aiQuery.value?.content ?? period}>
                  {aiQuery.value?.content
                    ? formatAiCards(aiQuery.value.content, domain).map((card, i) => (
                        <RewindInsightCard
                          key={i}
                          title={card.title}
                          text={card.text}
                          theme={card.theme}
                        />
                      ))
                    : null}
                </RewindCarousel>
              </ResourceStatus>
            )}
          </div>
        )}

        <ResourceStatus
          failed={statsQuery.failed}
          empty={statsQuery.empty}
          loading={
            <StateMessage variant="loading">Crunching the numbers...</StateMessage>
          }
          error={
            <StateMessage variant="error">
              {statsQuery.error?.message || "Failed to load stats"}
            </StateMessage>
          }
        >
          {stats ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.domain === "music" && (
                  <>
                    <RewindStatCard title="Total Plays" value={stats.totalPlays.toLocaleString()} />
                    <RewindStatCard title="Hours Listened" value={Math.round(stats.listeningMinutes / 60).toLocaleString()} />
                    <RewindStatCard title="New Discoveries" value={(stats.newTracks + stats.newArtists).toLocaleString()} subtitle="Tracks & Artists" />
                    <RewindStatCard title="Peak Listening" value={stats.peakHour?.label || "-"} subtitle={stats.peakDow?.label} />
                  </>
                )}
                {stats.domain === "watch" && (
                  <>
                    <RewindStatCard title="Total Watches" value={stats.totalWatches.toLocaleString()} />
                    <RewindStatCard title="Hours Watched" value={Math.round(stats.watchingMinutes / 60).toLocaleString()} />
                    <RewindStatCard title="Unique Titles" value={stats.uniqueTitles.toLocaleString()} subtitle={`${stats.movieWatches} Movies, ${stats.showWatches} Shows`} />
                    <RewindStatCard title="Peak Watching" value={stats.peakHour?.label || "-"} subtitle={stats.peakDow?.label} />
                  </>
                )}
                {stats.domain === "read" && (
                  <>
                    <RewindStatCard title="Total Events" value={stats.totalEvents.toLocaleString()} />
                    <RewindStatCard title="Chapters Logged" value={stats.chaptersLogged.toLocaleString()} />
                    <RewindStatCard title="Unique Titles" value={stats.uniqueTitles.toLocaleString()} />
                    <RewindStatCard title="Peak Reading" value={stats.peakHour?.label || "-"} subtitle={stats.peakDow?.label} />
                  </>
                )}
                {stats.domain === "games" && (
                  <>
                    <RewindStatCard title="Hours Played" value={formatHours(stats.totalMinutes)} />
                    <RewindStatCard title="Games Played" value={stats.uniqueGames.toLocaleString()} subtitle={stats.newGames ? `${stats.newGames} new` : undefined} />
                    {stats.sessionsAvailable ? (
                      <>
                        <RewindStatCard title="Sessions" value={stats.sessions.toLocaleString()} subtitle={stats.longestSession ? `Longest ${formatHours(stats.longestSession.minutes)}h · ${stats.longestSession.name}` : undefined} />
                        <RewindStatCard title="Peak Playing" value={stats.peakHour?.label || "-"} subtitle={stats.lateNightShare != null ? `${stats.lateNightShare}% late night` : stats.peakDow?.label} />
                      </>
                    ) : (
                      <RewindStatCard title="Sessions" value="-" subtitle="Install qMonitor to unlock session stats" />
                    )}
                  </>
                )}
              </div>

              {stats.domain === "all" ? (
                <RewindAllTiles stats={stats} />
              ) : (
                <RewindExtras stats={stats} period={period} unitLabel={extrasUnit} formatCount={extrasFormat} />
              )}

              {stats.domain === "games" ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <RewindTopList title="Top Games" items={stats.topGames.map((g) => ({ ...g, count: Number(formatHours(g.count).replace(/,/g, "")) }))} unitLabel="hrs" />
                  <div className="space-y-4">
                    {stats.topGenres.length ? (
                      <Panel className="p-5">
                        <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">Top Genres</h3>
                        <div className="flex flex-wrap gap-2">
                          {stats.topGenres.map((g) => (
                            <div key={g.id} className="px-3 py-1.5 rounded-full bg-[var(--bg-2)] text-[var(--ink)] text-sm">
                              {g.name} <span className="text-[var(--faint)] ml-1">{formatHours(g.count)}h</span>
                            </div>
                          ))}
                        </div>
                      </Panel>
                    ) : null}
                    <div className="grid grid-cols-2 gap-4">
                      {stats.achievementsInPeriod != null ? (
                        <RewindStatCard title="Achievements" value={stats.achievementsInPeriod.toLocaleString()} />
                      ) : null}
                      {stats.backlog != null ? (
                        <RewindStatCard title="Backlog" value={stats.backlog.toLocaleString()} subtitle="Unplayed today" />
                      ) : null}
                    </div>
                    <RewindNamedList
                      title="Tried & Set Aside"
                      items={stats.abandoned}
                      detail={(item) => `${item.count} min`}
                    />
                  </div>
                </div>
              ) : null}

              {stats.domain === "watch" &&
              (stats.topRated?.length || stats.unfinished?.length || stats.bingeRuns?.length) ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <RewindNamedList
                    title={
                      stats.avgRating != null
                        ? `Top Rated · avg ${stats.avgRating}`
                        : "Top Rated"
                    }
                    items={stats.topRated}
                    detail={(item) => `${item.count}/10`}
                  />
                  <RewindNamedList
                    title="Unfinished"
                    items={stats.unfinished}
                    detail={(item) => `${item.count}%`}
                  />
                  <RewindNamedList
                    title="Binge Days"
                    items={stats.bingeRuns}
                    detail={(item) => `${item.count} eps`}
                  />
                </div>
              ) : null}

              {stats.domain === "read" && stats.statusBreakdown ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <RewindStatCard title="Completed" value={stats.statusBreakdown.completed} />
                  <RewindStatCard title="Dropped" value={stats.statusBreakdown.dropped} />
                  <RewindStatCard title="Re-reading" value={stats.statusBreakdown.repeating} />
                  {stats.volumesRead ? (
                    <RewindStatCard title="Volumes" value={stats.volumesRead.toLocaleString()} />
                  ) : null}
                </div>
              ) : null}

              {stats.domain === "music" && stats.maxRepeatsInDay ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <RewindStatCard
                    title="On Repeat"
                    value={`${stats.maxRepeatsInDay.count}×`}
                    subtitle={`${stats.maxRepeatsInDay.name} in one day`}
                  />
                </div>
              ) : null}

              <div className="grid md:grid-cols-2 gap-4">
                {stats.domain === "music" && (
                  <>
                    <RewindTopList title="Top Artists" items={stats.topArtists} unitLabel="plays" />
                    <RewindTopList title="Top Tracks" items={stats.topTracks} unitLabel="plays" />
                  </>
                )}
                {stats.domain === "watch" && (
                  <>
                    <RewindTopList title="Top Titles" items={stats.topTitles} unitLabel="watches" />
                    <Panel className="p-5 h-full">
                      <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">Top Genres</h3>
                      <div className="space-y-3">
                        {stats.topGenres.map((g) => (
                          <div key={g.id} className="flex items-center justify-between">
                            <span className="text-[var(--ink)]">{g.name}</span>
                            <span className="text-[var(--muted)] font-mono text-sm">{g.count} watches</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </>
                )}
                {stats.domain === "read" && (
                  <>
                    <RewindTopList title="Top Titles" items={stats.topTitles} unitLabel="reads" />
                    <Panel className="p-5 h-full">
                      <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">Top Genres</h3>
                      <div className="space-y-3">
                        {stats.topGenres.map((g) => (
                          <div key={g.id} className="flex items-center justify-between">
                            <span className="text-[var(--ink)]">{g.name}</span>
                            <span className="text-[var(--muted)] font-mono text-sm">{g.count} reads</span>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </>
                )}
              </div>

              {stats.domain === "music" && (
                <Panel className="p-5">
                  <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">Top Genres</h3>
                  <div className="flex flex-wrap gap-2">
                    {stats.topGenres.map((g) => (
                      <div key={g.id} className="px-3 py-1.5 rounded-full bg-[var(--bg-2)] text-[var(--ink)] text-sm">
                        {g.name} <span className="text-[var(--faint)] ml-1">{g.count}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          ) : null}
        </ResourceStatus>
      </div>
    </>
  );
};
