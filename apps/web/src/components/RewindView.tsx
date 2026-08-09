"use client";

import { useEffect, useState } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { PageHeader, Panel, StateMessage, Button } from "@/components/ui";
import { musicFetch } from "@/lib/music";
import { watchFetch } from "@/lib/watch";
import { readFetch } from "@/lib/read";
import type { RewindInsightResponse, RewindStatsResponse, RewindTopItem } from "@questorylabs/shared";
import {
  completedRewindMonths,
  defaultRewindMonthForYear,
  getRewindAiPeriodError,
  isRewindAiGenerationAllowed,
  latestCompletedRewindMonth,
} from "@questorylabs/shared";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { generateCardTheme } from "@/lib/rewind-card-engine";
import { expandInsightChunks, parseInsightChunk, splitInsightContent } from "@/lib/rewind-ai-parser";
import { RewindInsightCard } from "@/components/rewind/RewindInsightCard";

const currentYear = new Date().getFullYear();

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Panel className="p-5 flex flex-col justify-center h-full">
      <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-2">{title}</h3>
      <div className="text-3xl font-semibold text-[var(--ink)]">{value}</div>
      {subtitle && <p className="text-xs text-[var(--faint)] mt-2">{subtitle}</p>}
    </Panel>
  );
}

function TopList({ title, items, unitLabel }: { title: string; items: RewindTopItem[]; unitLabel?: string }) {
  if (!items?.length) return null;
  return (
    <Panel className="p-5 h-full">
      <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">{title}</h3>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="w-6 text-center font-mono text-sm text-[var(--faint)]">{i + 1}</div>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-10 h-10 object-cover rounded bg-[var(--bg-2)]" />
            ) : (
              <div className="w-10 h-10 rounded bg-[var(--bg-2)]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[var(--ink)] font-medium truncate">{item.name}</div>
              {item.subtitle && <div className="text-[var(--muted)] text-sm truncate">{item.subtitle}</div>}
            </div>
            <div className="text-sm font-mono text-[var(--muted)]">
              {item.count} {unitLabel}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function formatAiCards(content: string, domain: "music" | "watch" | "read") {
  const originalChunks = splitInsightContent(content);
  const chunks = expandInsightChunks(originalChunks);

  return chunks.map((chunk, i) => {
    const { title, text, tagSlug } = parseInsightChunk(chunk);
    const theme = generateCardTheme(domain, i, tagSlug);

    return <RewindInsightCard key={i} title={title} text={text} theme={theme} />;
  });
}

export function RewindView({ domain }: { domain: "music" | "watch" | "read" }) {
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | "all">(() => defaultRewindMonthForYear(currentYear));
  const [forceRedo, setForceRedo] = useState(false);
  const { when: enterpriseEnabled } = useEnterpriseEnabled();

  const fetcher =
    domain === "music" ? musicFetch : domain === "watch" ? watchFetch : readFetch;

  const period = month === "all" ? `${year}` : `${year}-${month.toString().padStart(2, "0")}`;
  const aiGenerationAllowed = isRewindAiGenerationAllowed(period);
  const aiPeriodError = getRewindAiPeriodError(period);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // 1. Fast DB stats query
  const statsQuery = useResource({
    id: ["rewind-stats", domain, period, tz],
    load: () => fetcher<RewindStatsResponse>(`/analytics/rewind/stats?period=${period}&tz=${tz}`),
  });

  // 2. Slow AI agent query
  const aiQuery = useResource({
    id: ["rewind-ai", domain, period, forceRedo],
    load: async () => {
      const result = await fetcher<RewindInsightResponse>(
        `/analytics/rewind/ai?period=${period}&tz=${encodeURIComponent(tz)}${forceRedo ? "&forceRedo=true" : ""}`
      );
      if (forceRedo) {
        setForceRedo(false);
      }
      return result;
    },
    when: enterpriseEnabled && aiGenerationAllowed,
  });

  const years = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i).reverse();
  const availableMonths = completedRewindMonths(year);
  const hasCompletedMonths = availableMonths.length > 0;

  useEffect(() => {
    if (year < currentYear) return;
    const latest = latestCompletedRewindMonth(year);
    if (!latest) return;
    if (month === "all" || (typeof month === "number" && !availableMonths.includes(month))) {
      setMonth(latest);
    }
  }, [year, month, availableMonths]);
  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const handleYearChange = (y: number) => {
    setYear(y);
    setMonth(defaultRewindMonthForYear(y));
  };

  const handleRedo = () => {
    setForceRedo(true);
    setTimeout(() => aiQuery.reload(), 0);
  };

  const stats = statsQuery.value;

  return (
    <>
      <PageHeader
        title={`${domain.charAt(0).toUpperCase() + domain.slice(1)} Rewind`}
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
              disabled={year === currentYear && !hasCompletedMonths}
              className="bg-[var(--bg-1)] border border-[var(--line)] rounded px-2 py-1 text-sm text-[var(--ink)] disabled:opacity-50"
            >
              {year < currentYear ? <option value="all">All Year</option> : null}
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {months[m - 1]?.label ?? m}
                </option>
              ))}
            </select>
          </div>
        }
      />
      
      <div className="mt-8 space-y-6">
        
        {/* AI SECTION (Moved to top) */}
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
                <Button variant="ghost" onClick={() => document.getElementById('ai-carousel')?.scrollBy({ left: -window.innerWidth * 0.8, behavior: 'smooth' })} className="hidden md:flex p-2 !px-3 border border-[var(--line-strong)] rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                </Button>
                <Button variant="ghost" onClick={() => document.getElementById('ai-carousel')?.scrollBy({ left: window.innerWidth * 0.8, behavior: 'smooth' })} className="hidden md:flex p-2 !px-3 border border-[var(--line-strong)] rounded-lg hover:bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors mr-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                </Button>
                <Button onClick={handleRedo} disabled={!aiGenerationAllowed || aiQuery.refreshing || forceRedo} className="bg-[var(--surface-2)] hover:bg-[var(--bg-3)] border-[var(--line-strong)] hover:border-[var(--muted)] transition-all shadow-sm">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  Regenerate
                </Button>
              </div>
            </div>
            
            {!hasCompletedMonths && year === currentYear ? (
              <p className="text-sm text-[var(--muted)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8">
                No completed months yet for {year}. Monthly AI rewind will be available after the first month ends.
              </p>
            ) : !aiGenerationAllowed ? (
              <p className="text-sm text-[var(--muted)] rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8">
                {aiPeriodError ?? "AI rewind is not available for this period."}
              </p>
            ) : aiQuery.busy && !aiQuery.value ? (
              <div className="h-48 flex items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
                 <div className="flex flex-col items-center gap-4">
                   <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
                   <div className="text-[var(--muted)] font-medium text-sm">Synthesizing insights...</div>
                 </div>
              </div>
            ) : aiQuery.error ? (
              <StateMessage variant="error">{aiQuery.error.message || "Failed to load narrative"}</StateMessage>
            ) : (
              <div id="ai-carousel" className="flex overflow-x-auto snap-x snap-mandatory gap-8 pb-8 pt-4 -mx-4 px-4 md:-mx-8 md:px-8 custom-scrollbar">
                {aiQuery.value?.content ? formatAiCards(aiQuery.value.content, domain) : null}
              </div>
            )}
          </div>
        )}
        
        {/* STATS SECTION */}
        {statsQuery.busy ? (
          <StateMessage variant="loading">Crunching the numbers...</StateMessage>
        ) : statsQuery.error ? (
          <StateMessage variant="error">{statsQuery.error.message || "Failed to load stats"}</StateMessage>
        ) : stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.domain === "music" && (
                <>
                  <StatCard title="Total Plays" value={stats.totalPlays.toLocaleString()} />
                  <StatCard title="Hours Listened" value={Math.round(stats.listeningMinutes / 60).toLocaleString()} />
                  <StatCard title="New Discoveries" value={(stats.newTracks + stats.newArtists).toLocaleString()} subtitle="Tracks & Artists" />
                  <StatCard title="Peak Listening" value={stats.peakHour?.label || "-"} subtitle={stats.peakDow?.label} />
                </>
              )}
              {stats.domain === "watch" && (
                <>
                  <StatCard title="Total Watches" value={stats.totalWatches.toLocaleString()} />
                  <StatCard title="Hours Watched" value={Math.round(stats.watchingMinutes / 60).toLocaleString()} />
                  <StatCard title="Unique Titles" value={stats.uniqueTitles.toLocaleString()} subtitle={`${stats.movieWatches} Movies, ${stats.showWatches} Shows`} />
                  <StatCard title="Peak Watching" value={stats.peakHour?.label || "-"} subtitle={stats.peakDow?.label} />
                </>
              )}
              {stats.domain === "read" && (
                <>
                  <StatCard title="Total Events" value={stats.totalEvents.toLocaleString()} />
                  <StatCard title="Chapters Logged" value={stats.chaptersLogged.toLocaleString()} />
                  <StatCard title="Unique Titles" value={stats.uniqueTitles.toLocaleString()} />
                  <StatCard title="Peak Reading" value={stats.peakHour?.label || "-"} subtitle={stats.peakDow?.label} />
                </>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {stats.domain === "music" && (
                <>
                  <TopList title="Top Artists" items={stats.topArtists} unitLabel="plays" />
                  <TopList title="Top Tracks" items={stats.topTracks} unitLabel="plays" />
                </>
              )}
              {stats.domain === "watch" && (
                <>
                  <TopList title="Top Titles" items={stats.topTitles} unitLabel="watches" />
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
                  <TopList title="Top Titles" items={stats.topTitles} unitLabel="reads" />
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
                  {stats.topGenres.map(g => (
                    <div key={g.id} className="px-3 py-1.5 rounded-full bg-[var(--bg-2)] text-[var(--ink)] text-sm">
                      {g.name} <span className="text-[var(--faint)] ml-1">{g.count}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </div>
        ) : null}

      </div>
    </>
  );
}

