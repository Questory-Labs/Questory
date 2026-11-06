import type { RewindInsightResponse, RewindMusicStats } from "@questorylabs/shared";
import {
  commonExtras,
  priorPeriodBounds,
  zonedPeriodBounds,
} from "../../lib/rewind-stats";
import { zonedParts } from "../../lib/timezone";
import { listenMinutes } from "../../music/analytics/day-series";
import { hourLabel } from "../../music/analytics/heatmap-matrix";
import {
  aggregateMoodsFromListens,
  featuredArtists,
  maxRepeatsInDay,
} from "../../music/analytics/rewind-enrich";
import {
  DOW_LABELS,
  dowCounts,
  hourCounts,
  peakIndex,
} from "./music-aggregates";
import { rankedArtists, rankedGenres, rankedTracks } from "./music-rank";
import { artistCredits, artistOf } from "./music-catalog";
import { demoListens, earliestAt, type DemoListen } from "./music-log";

const PERIOD_RE = /^(\d{4})(?:-(\d{2}))?$/;
const MIN_YEAR = 1971;
const MAX_YEAR = 2100;

export function parseRewindPeriod(raw: unknown, timeZone: string): string {
  const match = typeof raw === "string" ? PERIOD_RE.exec(raw) : null;
  if (match) {
    const year = Number(match[1]);
    const month = match[2] == null ? 1 : Number(match[2]);
    if (year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12) {
      return raw as string;
    }
  }
  return String(zonedParts(new Date(), timeZone).year);
}

function withinBounds(listens: DemoListen[], start: Date, end: Date) {
  return listens.filter((l) => l.at >= start && l.at < end);
}

function genreRows(listen: DemoListen) {
  return {
    track: {
      genres: listen.track.genres.map((genre) => ({
        genre: { id: genre.id, name: genre.name, kind: genre.kind },
      })),
    },
  };
}

function firstSeenCount(
  allListens: DemoListen[],
  start: Date,
  idOf: (listen: DemoListen) => string,
  periodIds: Set<string>,
): number {
  const first = new Map<string, Date>();
  for (const listen of allListens) first.set(idOf(listen), listen.at);
  let count = 0;
  for (const id of periodIds) {
    const at = first.get(id);
    if (at && at >= start) count += 1;
  }
  return count;
}

export function musicRewindStats(
  period: string,
  timeZone: string,
  allListens: DemoListen[] = demoListens(),
): RewindMusicStats {
  const { start, end } = zonedPeriodBounds(period, timeZone);
  const prior = priorPeriodBounds(period, timeZone);
  const listens = withinBounds(allListens, start, end);
  const priorListens = withinBounds(allListens, prior.start, prior.end);
  const credits = artistCredits();

  const primaryCounts = new Map<string, { id: string; name: string; count: number }>();
  for (const listen of priorListens) {
    const artist = artistOf(listen.track);
    const row = primaryCounts.get(artist.id) ?? {
      id: artist.id,
      name: artist.name,
      count: 0,
    };
    row.count += 1;
    primaryCounts.set(artist.id, row);
  }

  const trackIds = new Set(listens.map((l) => l.track.id));
  const artistIds = new Set(listens.map((l) => l.track.artistId));
  const hourPeak = peakIndex(hourCounts(listens, timeZone));
  const dowPeak = peakIndex(dowCounts(listens, timeZone));

  return {
    domain: "music",
    period,
    totalPlays: listens.length,
    listeningMinutes: listenMinutes(listens),
    uniqueTracks: trackIds.size,
    uniqueArtists: artistIds.size,
    newTracks: firstSeenCount(allListens, start, (l) => l.track.id, trackIds),
    newArtists: firstSeenCount(allListens, start, (l) => l.track.artistId, artistIds),
    topArtists: rankedArtists(listens)
      .slice(0, 5)
      .map((a) => ({ id: a.id, name: a.name, count: a.count, imageUrl: a.imageUrl })),
    topTracks: rankedTracks(listens)
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        name: t.title,
        subtitle: credits.get(t.id) ?? t.artistName,
        count: t.count,
        imageUrl: t.imageUrl,
      })),
    topGenres: rankedGenres(listens, "genre")
      .slice(0, 5)
      .map((g) => ({ id: g.id, name: g.name, count: g.count })),
    peakHour: hourPeak
      ? { index: hourPeak.index, label: hourLabel(hourPeak.index), count: hourPeak.count }
      : null,
    peakDow: dowPeak
      ? { index: dowPeak.index, label: DOW_LABELS[dowPeak.index]!, count: dowPeak.count }
      : null,
    ...commonExtras({
      period,
      timeZone,
      events: listens.map((l) => ({
        at: l.at,
        itemId: l.track.artistId,
        name: artistOf(l.track).name,
      })),
      prior: [...primaryCounts.values()],
      priorStart: prior.start,
      earliestEventAt: earliestAt(allListens),
    }),
    topMoods: aggregateMoodsFromListens(listens.map(genreRows), 5),
    featuredArtists: featuredArtists(
      listens.map((l) => ({
        trackId: l.track.id,
        artistName: artistOf(l.track).name,
      })),
      credits,
    ),
    maxRepeatsInDay: maxRepeatsInDay(
      listens.map((l) => ({
        trackId: l.track.id,
        listenedAt: l.at,
        title: l.track.title,
        artistName: artistOf(l.track).name,
      })),
      timeZone,
    ),
  } satisfies RewindMusicStats;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function musicRewindInsight(
  period: string,
  timeZone: string,
): RewindInsightResponse {
  const stats = musicRewindStats(period, timeZone);
  const chunks: string[] = [];
  const hoursListened = Math.round(stats.listeningMinutes / 60);
  if (stats.totalPlays === 0) {
    chunks.push(
      `<musicyear>Nothing logged for **${period}** yet. Pick a more recent period to see the story of your listening.</musicyear>`,
    );
  } else {
    chunks.push(
      `<musicyear>**${formatNumber(stats.totalPlays)} plays** across ${stats.uniqueArtists} artists and ${stats.uniqueTracks} tracks in ${period}. A small circle of favorites, played with real commitment.</musicyear>`,
    );
    chunks.push(
      `<hourslistened>That adds up to **${formatNumber(hoursListened)} hours** of music, or about ${Math.round(hoursListened / 24)} full days with headphones on.</hourslistened>`,
    );
    const topArtist = stats.topArtists[0];
    if (topArtist) {
      chunks.push(
        `<topartist>**${topArtist.name}** led the period with ${formatNumber(topArtist.count)} plays, ahead of everyone else in the rotation.</topartist>`,
      );
    }
    if (stats.peakHour) {
      chunks.push(
        `<peaktime>Your music peaks around **${stats.peakHour.label}**${stats.peakDow ? `, and ${stats.peakDow.label} is your busiest day of the week` : ""}.</peaktime>`,
      );
    }
    const topMood = stats.topMoods?.[0];
    if (topMood) {
      chunks.push(
        `<vibecheck>The overall mood lands on **${topMood.name.toLowerCase()}**, tagged on ${formatNumber(topMood.count)} plays.</vibecheck>`,
      );
    }
    if (stats.newArtists > 0 || stats.newTracks > 0) {
      chunks.push(
        `<discoveries>You found **${stats.newArtists} new artists** and ${stats.newTracks} new tracks, so the rotation still has room to grow.</discoveries>`,
      );
    }
    if (stats.maxRepeatsInDay) {
      chunks.push(
        `<repeatday>On ${stats.maxRepeatsInDay.date} you played **${stats.maxRepeatsInDay.name}** ${stats.maxRepeatsInDay.count} times. We all have days like that.</repeatday>`,
      );
    }
    if (stats.longestStreakDays) {
      chunks.push(
        `<streak>Your longest run was **${stats.longestStreakDays} days** in a row with at least one play.</streak>`,
      );
    }
  }
  return {
    period,
    content: chunks.join("\n\n"),
    generatedAt: new Date().toISOString(),
    cached: true,
  } satisfies RewindInsightResponse;
}
