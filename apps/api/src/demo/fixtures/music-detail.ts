import type {
  MusicAlbumDetail,
  MusicAlbumListenPage,
  MusicArtistDetail,
  MusicTimeBucket,
  MusicTrackDetail,
  MusicTrackListenPage,
} from "@questorylabs/shared";
import { zonedHour, zonedWeekday } from "../../lib/timezone";
import { listenMinutes } from "../../music/analytics/day-series";
import {
  DOW_MON_LABELS,
  hourLabel,
  sunWeekdayToMonFirst,
} from "../../music/analytics/heatmap-matrix";
import { resolveMusicService } from "../../music/lib/music-service";
import { hourPeak, peakIndex, topService } from "./music-aggregates";
import { byCountDesc, rankedArtists, rankedGenres } from "./music-rank";
import {
  ALBUMS_BY_ID,
  DEMO_TRACKS,
  albumByIdOrFirst,
  artistByIdOrFirst,
  artistOf,
  featuredOf,
  trackByIdOrFirst,
  type DemoAlbum,
  type DemoArtist,
  type DemoTrack,
} from "./music-catalog";
import {
  dayKeys,
  earliestAt,
  inRange,
  latestAt,
  pageOf,
  releaseTitleOf,
  type DemoListen,
  type RangeKey,
} from "./music-log";

const ARTIST_TOP_ITEMS = 10;
const ALBUM_TOP_TRACKS = 25;
const TOP_MOODS = 10;

function isoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function serviceOf(listen: DemoListen): string | null {
  return resolveMusicService(
    listen.source.musicService,
    listen.source.submissionClient,
  );
}

function mondayFirstPeak(listens: DemoListen[], timeZone: string) {
  const counts = Array.from({ length: 7 }, () => 0);
  for (const listen of listens) {
    counts[sunWeekdayToMonFirst(zonedWeekday(listen.at, timeZone))]! += 1;
  }
  const peak = peakIndex(counts);
  return peak
    ? { day: peak.index, label: DOW_MON_LABELS[peak.index]!, count: peak.count }
    : null;
}

export function listensOfTrack(listens: DemoListen[], track: DemoTrack): DemoListen[] {
  return listens.filter((l) => l.track.id === track.id);
}

function listensOfArtist(listens: DemoListen[], artist: DemoArtist): DemoListen[] {
  return listens.filter(
    (l) =>
      l.track.artistId === artist.id || l.track.featuredIds.includes(artist.id),
  );
}

function listensOfAlbum(listens: DemoListen[], album: DemoAlbum): DemoListen[] {
  return listens.filter((l) => l.track.albumId === album.id);
}

function countByTrack(listens: DemoListen[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const listen of listens) {
    counts.set(listen.track.id, (counts.get(listen.track.id) ?? 0) + 1);
  }
  return counts;
}

function moodsOf(listens: DemoListen[]) {
  return rankedGenres(listens, "mood").slice(0, TOP_MOODS);
}

export function musicTrackDetail(
  allListens: DemoListen[],
  id: string | undefined,
  range: RangeKey,
  timeZone: string,
): MusicTrackDetail {
  const track = trackByIdOrFirst(id);
  const all = listensOfTrack(allListens, track);
  const listens = inRange(all, range);
  const uniqueDays = new Set(dayKeys(listens, timeZone)).size;
  return {
    range,
    track: {
      id: track.id,
      title: track.title,
      userDisplayName: null,
      artistName: artistOf(track).name,
      artistId: track.artistId,
      artists: [artistOf(track), ...featuredOf(track)].map((artist) => ({
        id: artist.id,
        name: artist.name,
        userDisplayName: null,
      })),
      releaseTitle: releaseTitleOf(track),
      releaseId: track.albumId,
      imageUrl: null,
      releaseImageManual: false,
      recordingMbid: null,
      spotifyId: null,
      durationMs: track.durationMs,
      genres: track.genres.map((g) => ({
        name: g.name,
        kind: g.kind,
        source: "payload_tag",
      })),
    },
    listenCount: listens.length,
    firstListenAt: isoOrNull(earliestAt(all)),
    latestListenAt: isoOrNull(latestAt(listens)),
    listeningMinutes: listenMinutes(listens),
    uniqueDays,
    avgListensPerDay:
      uniqueDays > 0 ? Math.round((listens.length / uniqueDays) * 10) / 10 : 0,
    peakHour: hourPeak(listens, timeZone),
    peakDow: mondayFirstPeak(listens, timeZone),
    topService: topService(listens),
  } satisfies MusicTrackDetail;
}

export function musicTrackListens(
  allListens: DemoListen[],
  id: string | undefined,
  range: RangeKey,
  page: number,
  pageSize: number,
): MusicTrackListenPage {
  const listens = inRange(listensOfTrack(allListens, trackByIdOrFirst(id)), range);
  return {
    total: listens.length,
    page,
    pageSize,
    items: pageOf(listens, page, pageSize).map((listen) => ({
      id: listen.id,
      listenedAt: listen.at.toISOString(),
      musicService: serviceOf(listen),
      mediaPlayer: listen.source.mediaPlayer,
    })),
  } satisfies MusicTrackListenPage;
}

export function musicAlbumListens(
  allListens: DemoListen[],
  id: string | undefined,
  range: RangeKey,
  page: number,
  pageSize: number,
): MusicAlbumListenPage {
  const listens = inRange(listensOfAlbum(allListens, albumByIdOrFirst(id)), range);
  return {
    total: listens.length,
    page,
    pageSize,
    items: pageOf(listens, page, pageSize).map((listen) => ({
      id: listen.id,
      listenedAt: listen.at.toISOString(),
      track: { id: listen.track.id, title: listen.track.title },
      musicService: serviceOf(listen),
      mediaPlayer: listen.source.mediaPlayer,
    })),
  } satisfies MusicAlbumListenPage;
}

function entityTimeseries(
  listens: DemoListen[],
  granularity: unknown,
  timeZone: string,
): MusicTimeBucket[] {
  if (granularity === "dayOfWeek") {
    const counts = Array.from({ length: 7 }, () => 0);
    for (const listen of listens) {
      counts[sunWeekdayToMonFirst(zonedWeekday(listen.at, timeZone))]! += 1;
    }
    return counts.map((count, day) => ({
      key: String(day),
      label: DOW_MON_LABELS[day]!,
      count,
    }));
  }
  const counts = Array.from({ length: 24 }, () => 0);
  for (const listen of listens) counts[zonedHour(listen.at, timeZone)]! += 1;
  return counts.map((count, hour) => ({
    key: String(hour),
    label: hourLabel(hour),
    count,
  }));
}

export function musicEntityTimeseries(
  allListens: DemoListen[],
  entity: "track" | "artist" | "album",
  id: string | undefined,
  granularity: unknown,
  range: RangeKey,
  timeZone: string,
): MusicTimeBucket[] {
  const scoped =
    entity === "track"
      ? listensOfTrack(allListens, trackByIdOrFirst(id))
      : entity === "artist"
        ? listensOfArtist(allListens, artistByIdOrFirst(id))
        : listensOfAlbum(allListens, albumByIdOrFirst(id));
  return entityTimeseries(inRange(scoped, range), granularity, timeZone);
}

export function trackListensInRange(
  allListens: DemoListen[],
  id: string | undefined,
  range: RangeKey,
): DemoListen[] {
  return inRange(listensOfTrack(allListens, trackByIdOrFirst(id)), range);
}

export function musicArtistDetail(
  allListens: DemoListen[],
  id: string | undefined,
  range: RangeKey,
  timeZone: string,
): MusicArtistDetail {
  const artist = artistByIdOrFirst(id);
  const all = listensOfArtist(allListens, artist);
  const listens = inRange(all, range);
  const rankIndex = rankedArtists(inRange(allListens, range)).findIndex(
    (row) => row.id === artist.id,
  );
  const trackCounts = countByTrack(listens);
  const albumCounts = new Map<string, number>();
  for (const listen of listens) {
    const albumId = listen.track.albumId;
    if (albumId) albumCounts.set(albumId, (albumCounts.get(albumId) ?? 0) + 1);
  }
  const topTracks = DEMO_TRACKS.filter((t) => trackCounts.has(t.id)).map((t) => ({
    id: t.id,
    title: t.title,
    releaseTitle: releaseTitleOf(t),
    imageUrl: null,
    count: trackCounts.get(t.id) ?? 0,
  }));
  const topAlbums = [...albumCounts.entries()].flatMap(([albumId, count]) => {
    const album = ALBUMS_BY_ID.get(albumId);
    return album
      ? [{ id: album.id, title: album.title, imageUrl: null, year: album.year, count }]
      : [];
  });
  return {
    range,
    artist: {
      id: artist.id,
      name: artist.name,
      userDisplayName: null,
      mbid: null,
      imageUrl: null,
      imageManual: false,
      genres: artist.genres.map((g) => g.name),
    },
    listenCount: listens.length,
    firstListenAt: isoOrNull(earliestAt(all)),
    latestListenAt: isoOrNull(latestAt(all)),
    listeningMinutes: listenMinutes(listens),
    peakHour: hourPeak(listens, timeZone),
    peakDow: mondayFirstPeak(listens, timeZone),
    rank: rankIndex >= 0 ? rankIndex + 1 : null,
    topTracks: byCountDesc(topTracks).slice(0, ARTIST_TOP_ITEMS),
    topAlbums: byCountDesc(topAlbums).slice(0, ARTIST_TOP_ITEMS),
    topMoods: moodsOf(listens),
  } satisfies MusicArtistDetail;
}

export function musicAlbumDetail(
  allListens: DemoListen[],
  id: string | undefined,
  range: RangeKey,
  timeZone: string,
): MusicAlbumDetail {
  const album = albumByIdOrFirst(id);
  const all = listensOfAlbum(allListens, album);
  const listens = inRange(all, range);
  const trackCounts = countByTrack(listens);
  const topTracks = DEMO_TRACKS.filter((t) => trackCounts.has(t.id)).map((t) => ({
    id: t.id,
    title: t.title,
    durationMs: t.durationMs,
    count: trackCounts.get(t.id) ?? 0,
  }));
  return {
    range,
    album: {
      id: album.id,
      title: album.title,
      userDisplayName: null,
      year: album.year,
      imageUrl: null,
      imageManual: false,
      mbid: null,
      artistId: album.artistId,
      artistName: artistByIdOrFirst(album.artistId).name,
    },
    listenCount: listens.length,
    firstListenAt: isoOrNull(earliestAt(all)),
    latestListenAt: isoOrNull(latestAt(listens)),
    listeningMinutes: listenMinutes(listens),
    peakHour: hourPeak(listens, timeZone),
    peakDow: mondayFirstPeak(listens, timeZone),
    topTracks: byCountDesc(topTracks).slice(0, ALBUM_TOP_TRACKS),
    topMoods: moodsOf(listens),
  } satisfies MusicAlbumDetail;
}
