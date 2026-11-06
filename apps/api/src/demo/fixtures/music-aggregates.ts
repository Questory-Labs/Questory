import type {
  MusicBreakdownResponse,
  MusicHeatmap,
  MusicInsights,
  MusicMoversResponse,
  MusicOverview,
  MusicPlayingNow,
  MusicRecentPage,
  MusicTimeBucket,
  MusicTopsResponse,
} from "@questorylabs/shared";
import { longestStreakDays } from "../../lib/rewind-stats";
import {
  computeStreakDays,
  zonedHour,
  zonedIsoWeekKey,
  zonedWeekday,
} from "../../lib/timezone";
import { listenMinutes, percentDelta, rollUpDays } from "../../music/analytics/day-series";
import { buildHourDowHeatmap, hourLabel } from "../../music/analytics/heatmap-matrix";
import {
  computeMovers,
  concentrationShare,
  type RankedItem,
} from "../../music/analytics/movers";
import {
  resolveMusicService,
  resolveMusicServiceLabel,
} from "../../music/lib/music-service";
import { daysAgo } from "./helpers";
import {
  albumOf,
  artistOf,
  trackByIdOrFirst,
  type DemoTrack,
} from "./music-catalog";
import {
  dayKeys,
  earliestAt,
  inPreviousRange,
  inRange,
  latestAt,
  mostCommon,
  pageOf,
  rangeSince,
  releaseTitleOf,
  type DemoListen,
  type RangeKey,
} from "./music-log";

import {
  byCountDesc,
  rankedArtists,
  rankedByKind,
  rankedGenres,
  rankedTracks,
  tallyBy,
  type TopsKind,
} from "./music-rank";

const STREAK_SAMPLE = 2000;
const CONCENTRATION_TOP_N = 10;
const MOVERS_WINDOW = 50;
export const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function musicOverview(
  listens: DemoListen[],
  timeZone: string,
): MusicOverview {
  const latest = latestAt(listens);
  const earliest = earliestAt(listens);
  return {
    username: "Demo Player",
    totalListens: listens.length,
    uniqueTracks: new Set(listens.map((l) => l.track.id)).size,
    uniqueArtists: rankedArtists(listens).length,
    latestListenAt: latest?.toISOString() ?? null,
    earliestListenAt: earliest?.toISOString() ?? null,
    streakDays: computeStreakDays(
      listens.slice(0, STREAK_SAMPLE).map((l) => l.at),
      timeZone,
    ),
  } satisfies MusicOverview;
}

export function musicTops(
  listens: DemoListen[],
  kind: TopsKind,
  range: RangeKey,
  page: number,
  pageSize: number,
): MusicTopsResponse {
  const inWindow = inRange(listens, range);
  const ranked = rankedByKind(inWindow, kind);
  return {
    periodListens: inWindow.length,
    total: ranked.length,
    page,
    pageSize,
    items: pageOf<MusicTopsResponse["items"][number]>(ranked, page, pageSize),
  } satisfies MusicTopsResponse;
}

export function musicMovers(
  listens: DemoListen[],
  kind: TopsKind,
  range: RangeKey,
  limit: number,
): MusicMoversResponse {
  const inWindow = inRange(listens, range);
  const previousWindow = inPreviousRange(listens, range);
  const current: RankedItem[] = rankedByKind(inWindow, kind);
  const previous: RankedItem[] = rankedByKind(previousWindow, kind);
  const hasPreviousWindow = range !== "all";
  const share = concentrationShare(current, inWindow.length, CONCENTRATION_TOP_N);
  const previousShare =
    hasPreviousWindow && previousWindow.length > 0
      ? concentrationShare(previous, previousWindow.length, CONCENTRATION_TOP_N)
      : null;
  return {
    kind,
    range,
    periodListens: inWindow.length,
    previousListens: previousWindow.length,
    concentration: {
      topN: CONCENTRATION_TOP_N,
      share,
      previousShare,
      delta:
        previousShare != null ? Math.round((share - previousShare) * 10) / 10 : null,
    },
    movers: hasPreviousWindow
      ? computeMovers(current, previous, MOVERS_WINDOW, limit)
      : [],
  } satisfies MusicMoversResponse;
}

export function hourCounts(listens: DemoListen[], timeZone: string): number[] {
  const counts = Array.from({ length: 24 }, () => 0);
  for (const listen of listens) counts[zonedHour(listen.at, timeZone)]! += 1;
  return counts;
}

export function dowCounts(listens: DemoListen[], timeZone: string): number[] {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const listen of listens) counts[zonedWeekday(listen.at, timeZone)]! += 1;
  return counts;
}

export function peakIndex(counts: number[]): { index: number; count: number } | null {
  let best: { index: number; count: number } | null = null;
  counts.forEach((count, index) => {
    if (count > 0 && (!best || count > best.count)) best = { index, count };
  });
  return best;
}

export function hourPeak(listens: DemoListen[], timeZone: string) {
  const peak = peakIndex(hourCounts(listens, timeZone));
  return peak
    ? { hour: peak.index, label: hourLabel(peak.index), count: peak.count }
    : null;
}

export function serviceLabelOf(listen: DemoListen): string {
  return resolveMusicServiceLabel(
    listen.source.musicService,
    listen.source.submissionClient,
  );
}

function firstSeenSince(
  listens: DemoListen[],
  since: Date | null,
  idOf: (track: DemoTrack) => string,
): number {
  const first = new Map<string, Date>();
  for (const listen of listens) first.set(idOf(listen.track), listen.at);
  if (!since) return first.size;
  let count = 0;
  for (const at of first.values()) if (at >= since) count += 1;
  return count;
}

export function musicInsights(
  listens: DemoListen[],
  range: RangeKey,
  timeZone: string,
): MusicInsights {
  const since = rangeSince(range);
  const inWindow = inRange(listens, range);
  const previousWindow = inPreviousRange(listens, range);
  const dow = peakIndex(dowCounts(inWindow, timeZone));
  const topTrack = rankedTracks(inWindow)[0];
  const minutes = listenMinutes(inWindow);
  const named = (row?: { id: string; name: string; count: number }) =>
    row ? { id: row.id, name: row.name, count: row.count } : null;
  const hasPrevious = range !== "all";
  const previousMinutes = listenMinutes(previousWindow);
  return {
    range,
    periodListens: inWindow.length,
    peakHour: hourPeak(inWindow, timeZone),
    peakDow: dow
      ? { day: dow.index, label: DOW_LABELS[dow.index]!, count: dow.count }
      : null,
    topGenre: named(rankedGenres(inWindow, "genre")[0]),
    topMood: named(rankedGenres(inWindow, "mood")[0]),
    listeningMinutes: minutes,
    listensWithDuration: inWindow.length,
    durationCoverage: inWindow.length > 0 ? 100 : 0,
    newArtists: firstSeenSince(listens, since, (t) => t.artistId),
    newTracks: firstSeenSince(listens, since, (t) => t.id),
    topTrackShare:
      topTrack && inWindow.length > 0
        ? Math.round((topTrack.count / inWindow.length) * 1000) / 10
        : 0,
    uniqueArtists: new Set(inWindow.map((l) => l.track.artistId)).size,
    uniqueTracks: new Set(inWindow.map((l) => l.track.id)).size,
    serviceBreakdown: byCountDesc(
      tallyBy(inWindow, (listen) => [
        {
          key: serviceLabelOf(listen),
          make: () => ({ name: serviceLabelOf(listen), count: 0 }),
        },
      ]),
    ).slice(0, 5),
    longestStreakDays: longestStreakDays(dayKeys(inWindow, timeZone)),
    compare: {
      previousListens: hasPrevious ? previousWindow.length : null,
      deltaPct: hasPrevious ? percentDelta(inWindow.length, previousWindow.length) : null,
      previousMinutes: hasPrevious ? previousMinutes : null,
      minutesDeltaPct: hasPrevious ? percentDelta(minutes, previousMinutes) : null,
    },
  } satisfies MusicInsights;
}

export function musicBreakdown(
  listens: DemoListen[],
  kind: "years" | "services",
  range: RangeKey,
  limit: number,
): MusicBreakdownResponse {
  const inWindow = inRange(listens, range);
  if (kind === "services") {
    return {
      periodListens: inWindow.length,
      items: tallyBy(inWindow, (listen) => {
        const label = serviceLabelOf(listen);
        return [{ key: label, make: () => ({ key: label, label, count: 0 }) }];
      }),
    } satisfies MusicBreakdownResponse;
  }
  const years = new Map<number, number>();
  let unknown = 0;
  for (const listen of inWindow) {
    const album = albumOf(listen.track);
    if (album) years.set(album.year, (years.get(album.year) ?? 0) + 1);
    else unknown += 1;
  }
  const items = [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, limit)
    .map(([year, count]) => ({ key: String(year), label: String(year), count }));
  if (unknown > 0) items.push({ key: "unknown", label: "Unknown", count: unknown });
  return { periodListens: inWindow.length, items } satisfies MusicBreakdownResponse;
}

export type TimeseriesGranularity = "hourOfDay" | "dayOfWeek" | "day" | "week";

export function parseGranularity(raw: unknown): TimeseriesGranularity {
  return raw === "hourOfDay" || raw === "dayOfWeek" || raw === "week" ? raw : "day";
}

export function musicTimeseries(
  listens: DemoListen[],
  granularity: TimeseriesGranularity,
  range: RangeKey,
  timeZone: string,
): MusicTimeBucket[] {
  const ascending = [...inRange(listens, range)].reverse();
  if (granularity === "hourOfDay") {
    return hourCounts(ascending, timeZone).map((count, hour) => ({
      key: String(hour),
      label: `${hour}:00`,
      count,
    }));
  }
  if (granularity === "dayOfWeek") {
    return dowCounts(ascending, timeZone).map((count, day) => ({
      key: String(day),
      label: DOW_LABELS[day]!,
      count,
    }));
  }
  if (granularity === "day") {
    return rollUpDays(
      ascending.map((l) => ({ listenedAt: l.at, track: l.track })),
      timeZone,
    );
  }
  const weeks = new Map<string, number>();
  for (const listen of ascending) {
    const key = zonedIsoWeekKey(listen.at, timeZone);
    weeks.set(key, (weeks.get(key) ?? 0) + 1);
  }
  return [...weeks.entries()].map(([key, count]) => ({ key, label: key, count }));
}

export function heatmapOf(listens: DemoListen[], timeZone: string): MusicHeatmap {
  return buildHourDowHeatmap(
    listens.map((l) => ({ at: l.at, count: 1 })),
    timeZone,
  ) satisfies MusicHeatmap;
}

export function musicRecent(
  listens: DemoListen[],
  filters: { q?: string; source?: string },
  page: number,
  pageSize: number,
): MusicRecentPage {
  const needle = filters.q?.trim().slice(0, 100).toLowerCase();
  const filtered = listens.filter((listen) => {
    const client = listen.source.submissionClient;
    if (filters.source === "lastfm" && client !== "questory_lastfm") return false;
    if (filters.source === "imports" && !client.endsWith("_import")) return false;
    if (
      filters.source === "listenbrainz" &&
      (client === "questory_lastfm" || client.endsWith("_import"))
    ) {
      return false;
    }
    if (!needle) return true;
    return [
      listen.track.title,
      artistOf(listen.track).name,
      releaseTitleOf(listen.track) ?? "",
    ].some((text) => text.toLowerCase().includes(needle));
  });
  return {
    total: filtered.length,
    page,
    pageSize,
    items: pageOf(filtered, page, pageSize).map((listen) => ({
      id: listen.id,
      listenedAt: listen.at.toISOString(),
      track: {
        id: listen.track.id,
        title: listen.track.title,
        artistId: listen.track.artistId,
        artistName: artistOf(listen.track).name,
        releaseId: listen.track.albumId,
        releaseTitle: releaseTitleOf(listen.track),
        imageUrl: null,
        genres: listen.track.genres.slice(0, 5).map((g) => g.name),
      },
      mediaPlayer: listen.source.mediaPlayer,
      submissionClient: listen.source.submissionClient,
      musicService: resolveMusicService(
        listen.source.musicService,
        listen.source.submissionClient,
      ),
    })),
  } satisfies MusicRecentPage;
}

export function musicPlayingNow(): MusicPlayingNow {
  const track = trackByIdOrFirst("demo-track-daft-punk-giorgio-by-moroder");
  const now = Date.parse(daysAgo(0));
  return {
    updatedAt: new Date(now).toISOString(),
    startedAt: new Date(now - 40_000).toISOString(),
    source: "lastfm",
    track: {
      id: track.id,
      title: track.title,
      artistId: track.artistId,
      artistName: artistOf(track).name,
      releaseId: track.albumId,
      releaseTitle: releaseTitleOf(track),
      imageUrl: null,
      year: albumOf(track)?.year ?? null,
      durationMs: track.durationMs,
    },
  } satisfies MusicPlayingNow;
}

export function topService(listens: DemoListen[]) {
  const best = mostCommon(listens.map(serviceLabelOf));
  return best ? { name: best.key, count: best.count } : null;
}
