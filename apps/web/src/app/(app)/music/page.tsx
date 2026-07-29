"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type {
  MusicInsights,
  MusicOverview,
  MusicTimeBucket,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicSparkline } from "@/components/music/MusicSparkline";
import { StatCard } from "@/components/StatCard";
import { OverflowMarquee, PageHeader, Panel, StateMessage } from "@/components/ui";
import { useMusicPlayingNow } from "@/hooks/useMusicPlayingNow";
import {
  formatDeltaPct,
  formatListenDate,
  formatMinutes,
  musicFetch,
} from "@/lib/music";
import { withTz } from "@/lib/dates";

function TopTeaser({
  title,
  href,
  kind,
}: {
  title: string;
  href: string;
  kind: "artists" | "tracks";
}) {
  const q = useQuery({
    queryKey: ["music-tops-home", kind],
    queryFn: () =>
      musicFetch<MusicTopsResponse>(
        `/analytics/tops/${kind}?range=week&limit=5`,
      ),
  });

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          {title}
        </h2>
        <Link
          href={href}
          className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--accent)]"
        >
          All charts →
        </Link>
      </div>
      {q.isLoading && (
        <StateMessage variant="loading" className="mt-2">
          Loading…
        </StateMessage>
      )}
      <ol className="mt-3 space-y-2">
        {(q.data?.items || []).map((item, i) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <span className="w-4 shrink-0 font-mono text-[var(--faint)]">
              {i + 1}.
            </span>
            <MusicCover
              src={item.imageUrl}
              alt=""
              size="sm"
            />
            <OverflowMarquee className="flex-1">
              <Link
                href={
                  kind === "artists"
                    ? `/music/artists/${item.id}`
                    : `/music/tracks/${item.id}`
                }
                className="text-[var(--ink)] hover:text-[var(--accent)]"
              >
                {item.name || item.title}
                {item.artistName ? (
                  <span className="text-[var(--muted)]">
                    {" "}
                    · {item.artistName}
                  </span>
                ) : null}
              </Link>
            </OverflowMarquee>
            <span className="shrink-0 font-mono text-[11px] text-[var(--faint)]">
              {item.count}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function MusicHomePage() {
  const overview = useQuery({
    queryKey: ["music-overview"],
    queryFn: () => musicFetch<MusicOverview>(withTz("/analytics/overview")),
  });
  const series = useQuery({
    queryKey: ["music-timeseries-home"],
    queryFn: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz("/analytics/timeseries?granularity=day&range=month"),
      ),
  });
  const insights = useQuery({
    queryKey: ["music-insights-week"],
    queryFn: () =>
      musicFetch<MusicInsights>(withTz("/analytics/insights?range=week")),
  });
  const playing = useMusicPlayingNow();

  const weekListens = insights.data?.periodListens;
  const delta = insights.data?.compare.deltaPct;

  return (
    <>
      <PageHeader
        title="Music"
        description="Listening pulse from your scrobbles — what’s playing, when you listen, and what’s shifting."
        actions={
          <Link
            href="/music/insights"
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--accent)]"
          >
            Insights →
          </Link>
        }
      />

      {overview.isLoading && (
        <StateMessage variant="loading">Loading overview…</StateMessage>
      )}
      {overview.isError && (
        <StateMessage variant="error">
          Could not load music analytics.
        </StateMessage>
      )}

      {playing.data?.track ? (
        <Panel
          wrapperClassName="mb-8"
          className="flex items-center gap-4 p-4"
        >
          <MusicCover
            src={playing.data.track.imageUrl}
            alt=""
            size="md"
          />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
              Now playing
            </p>
            <OverflowMarquee className="mt-1 text-[var(--ink)]">
              <Link
                href={`/music/tracks/${playing.data.track.id}`}
                className="hover:text-[var(--accent)]"
              >
                {playing.data.track.title}
              </Link>
            </OverflowMarquee>
            <Link
              href={`/music/artists/${playing.data.track.artistId}`}
              className="text-sm text-[var(--muted)] hover:text-[var(--accent)]"
            >
              {playing.data.track.artistName}
            </Link>
          </div>
        </Panel>
      ) : null}

      {overview.data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <StatCard label="Listens" value={overview.data.totalListens} />
            <StatCard label="Artists" value={overview.data.uniqueArtists} />
            <StatCard label="Tracks" value={overview.data.uniqueTracks} />
            <StatCard label="Streak" value={`${overview.data.streakDays}d`} />
            <StatCard
              label="This week"
              value={weekListens ?? "—"}
              hint={
                delta != null
                  ? `${formatDeltaPct(delta)} vs prior week`
                  : undefined
              }
            />
            <StatCard
              label="Listening time"
              value={
                insights.data
                  ? formatMinutes(insights.data.listeningMinutes)
                  : "—"
              }
              hint={
                insights.data && insights.data.durationCoverage < 100
                  ? `${insights.data.durationCoverage}% of scrobbles have duration`
                  : undefined
              }
            />
            <StatCard
              label="First listen"
              value={formatListenDate(overview.data.earliestListenAt)}
            />
            <StatCard
              label="Latest listen"
              value={formatListenDate(overview.data.latestListenAt)}
            />
          </div>

          <section className="mt-10">
            <h2 className="font-display text-xl text-[var(--ink)]">
              Last 30 days
            </h2>
            <Panel wrapperClassName="mt-4" className="p-4">
              {series.isLoading ? (
                <StateMessage variant="loading">Loading activity…</StateMessage>
              ) : (
                <MusicSparkline buckets={series.data || []} />
              )}
            </Panel>
          </section>

          {insights.data && insights.data.periodListens > 0 ? (
            <section className="mt-10">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-xl text-[var(--ink)]">
                  This week
                </h2>
                <Link
                  href="/music/insights"
                  className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] hover:text-[var(--accent)]"
                >
                  More insights →
                </Link>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  insights.data.peakHour
                    ? {
                        label: "Peak hour",
                        value: insights.data.peakHour.label,
                        hint: `${insights.data.peakHour.count} listens`,
                      }
                    : null,
                  insights.data.peakDow
                    ? {
                        label: "Peak day",
                        value: insights.data.peakDow.label,
                        hint: `${insights.data.peakDow.count} listens`,
                      }
                    : null,
                  insights.data.topGenre
                    ? {
                        label: "Top genre",
                        value: insights.data.topGenre.name,
                        hint: `${insights.data.topGenre.count} tagged listens`,
                      }
                    : null,
                  insights.data.topMood
                    ? {
                        label: "Top mood",
                        value: insights.data.topMood.name,
                        hint: `${insights.data.topMood.count} tagged listens`,
                      }
                    : null,
                  {
                    label: "New artists",
                    value: insights.data.newArtists,
                    hint: "First heard this week",
                  },
                  {
                    label: "New tracks",
                    value: insights.data.newTracks,
                    hint: "First heard this week",
                  },
                  {
                    label: "Top track share",
                    value: `${insights.data.topTrackShare}%`,
                    hint: "Of this week’s listens",
                  },
                ]
                  .filter(Boolean)
                  .slice(0, 6)
                  .map((card) => (
                    <StatCard
                      key={card!.label}
                      label={card!.label}
                      value={card!.value}
                      hint={card!.hint}
                    />
                  ))}
              </div>
            </section>
          ) : null}

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            <TopTeaser
              title="Top artists"
              kind="artists"
              href="/music/charts?kind=artists"
            />
            <TopTeaser
              title="Top tracks"
              kind="tracks"
              href="/music/charts?kind=tracks"
            />
          </div>
        </>
      )}
    </>
  );
}
