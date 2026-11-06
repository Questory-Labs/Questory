import { parsePageParam, parsePageSizeParam } from "@questorylabs/shared";
import { parseTimeZone, zonedDayKey } from "../../lib/timezone";
import { daysAgo } from "./helpers";
import {
  ALBUMS_BY_ID,
  DEMO_ARTISTS,
  DEMO_TRACKS,
  TRACKS_BY_ID,
  type DemoArtist,
  type DemoTrack,
} from "./music-catalog";

export type DemoSource = {
  musicService: string | null;
  submissionClient: string;
  mediaPlayer: string | null;
};

const SOURCE_LASTFM: DemoSource = {
  musicService: "lastfm",
  submissionClient: "questory_lastfm",
  mediaPlayer: null,
};
const SOURCE_IMPORT: DemoSource = {
  musicService: "spotify",
  submissionClient: "spotify_import",
  mediaPlayer: null,
};
const SOURCE_SPOTIFY: DemoSource = {
  musicService: "spotify",
  submissionClient: "multi-scrobbler",
  mediaPlayer: "Spotify",
};
const SOURCE_PLEX: DemoSource = {
  musicService: "plex",
  submissionClient: "multi-scrobbler",
  mediaPlayer: "Plexamp",
};

type LogEntry = {
  id: string;
  track: DemoTrack;
  source: DemoSource;
  dayOffset: number;
  minuteOfDay: number;
  minutesAgo: number | null;
};

export type DemoListen = {
  id: string;
  at: Date;
  track: DemoTrack;
  source: DemoSource;
};

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const LOG_DAYS = 900;
const UNBROKEN_DAYS = 41;
const GAP_DAY = 42;
const LOG_SEED = 0x51a7e;
const FRESH_TRACK_IDS = [
  "demo-track-daft-punk-instant-crush",
  "demo-track-daft-punk-get-lucky",
  "demo-track-mitski-nobody",
  "demo-track-mitski-washing-machine-heart",
  "demo-track-caribou-can-t-do-without-you",
  "demo-track-radiohead-reckoner",
  "demo-track-radiohead-weird-fishes-arpeggi",
  "demo-track-phoebe-bridgers-kyoto",
  "demo-track-tame-impala-let-it-happen",
];

function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function affinity(artist: DemoArtist, dayOffset: number): number {
  if (artist.weight === 0) return 0;
  if (artist.firstDayOffset != null && dayOffset > artist.firstDayOffset) return 0;
  if (artist.lastDayOffset != null && dayOffset < artist.lastDayOffset) return 0;
  const wave = 1 + 0.8 * Math.sin((dayOffset / 45) * Math.PI + artist.phase);
  const discovery =
    artist.firstDayOffset != null && artist.firstDayOffset - dayOffset < 30 ? 3 : 1;
  return artist.weight * wave * discovery;
}

function pickArtist(random: () => number, dayOffset: number): DemoArtist {
  const weights = DEMO_ARTISTS.map((a) => affinity(a, dayOffset));
  let roll = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < DEMO_ARTISTS.length; i += 1) {
    roll -= weights[i]!;
    if (roll <= 0 && weights[i]! > 0) return DEMO_ARTISTS[i]!;
  }
  return DEMO_ARTISTS[0]!;
}

function pickSource(random: () => number, dayOffset: number): DemoSource {
  if (dayOffset > 365) return SOURCE_IMPORT;
  const roll = random();
  if (roll < 0.7) return SOURCE_LASTFM;
  return roll < 0.92 ? SOURCE_SPOTIFY : SOURCE_PLEX;
}

function anchoredSessionStart(random: () => number, sessionIndex: number): number {
  return sessionIndex === 0
    ? 300 + Math.floor(random() * 120)
    : 1020 + Math.floor(random() * 120);
}

function sessionStartMinute(random: () => number): number {
  const roll = random();
  if (roll < 0.6) return 1020 + Math.floor(random() * 300);
  if (roll < 0.85) return 480 + Math.floor(random() * 240);
  return 750 + Math.floor(random() * 210);
}

function buildSession(
  random: () => number,
  dayOffset: number,
  remaining: number,
): DemoTrack[] {
  const artist = pickArtist(random, dayOffset);
  const artistTracks = DEMO_TRACKS.filter((t) => t.artistId === artist.id);
  const seedTrack = artistTracks[Math.floor(random() * artistTracks.length)]!;
  if (random() < 0.06) {
    return Array.from(
      { length: Math.min(remaining, 3 + Math.floor(random() * 4)) },
      () => seedTrack,
    );
  }
  const pool = seedTrack.albumId
    ? artistTracks.filter((t) => t.albumId === seedTrack.albumId)
    : artistTracks;
  const start = pool.indexOf(seedTrack);
  return Array.from(
    { length: Math.min(remaining, 1 + Math.floor(random() * 4)) },
    (_, i) => pool[(start + i) % pool.length]!,
  );
}

function buildLog(): LogEntry[] {
  const random = mulberry32(LOG_SEED);
  const entries: LogEntry[] = [];
  for (let dayOffset = LOG_DAYS; dayOffset >= 0; dayOffset -= 1) {
    if (dayOffset === GAP_DAY) continue;
    const skipRoll = random();
    if (dayOffset > UNBROKEN_DAYS && skipRoll < 0.1) continue;
    let remaining = 4 + Math.floor(random() * 6) + (dayOffset % 7 < 2 ? 3 : 0);
    for (let sessionIndex = 0; remaining > 0; sessionIndex += 1) {
      const anchored = dayOffset <= UNBROKEN_DAYS && sessionIndex < 2;
      const built = buildSession(random, dayOffset, remaining);
      const session = anchored && sessionIndex === 0 ? built.slice(0, 1) : built;
      let minute = anchored
        ? anchoredSessionStart(random, sessionIndex)
        : sessionStartMinute(random);
      for (const track of session) {
        if (minute >= 1440) break;
        entries.push({
          id: `demo-listen-${entries.length + 1}`,
          track,
          source: pickSource(random, dayOffset),
          dayOffset,
          minuteOfDay: minute,
          minutesAgo: null,
        });
        minute += Math.ceil(track.durationMs / MINUTE_MS);
      }
      remaining -= session.length;
    }
  }
  FRESH_TRACK_IDS.forEach((id, i) => {
    const track = TRACKS_BY_ID.get(id);
    if (!track) return;
    entries.push({
      id: `demo-listen-fresh-${i + 1}`,
      track,
      source: i % 3 === 2 ? SOURCE_SPOTIFY : SOURCE_LASTFM,
      dayOffset: 0,
      minuteOfDay: 0,
      minutesAgo: 2 + i * 7,
    });
  });
  return entries;
}

const LOG: LogEntry[] = buildLog();

export function demoLogSize(): number {
  return LOG.length;
}

export function demoListens(): DemoListen[] {
  const nowIso = daysAgo(0);
  const now = Date.parse(nowIso);
  const today = now - (now % DAY_MS);
  const listens: DemoListen[] = [];
  for (const entry of LOG) {
    const at =
      entry.minutesAgo != null
        ? now - entry.minutesAgo * MINUTE_MS
        : today - entry.dayOffset * DAY_MS + entry.minuteOfDay * MINUTE_MS;
    if (at > now) continue;
    listens.push({
      id: entry.id,
      at: new Date(at),
      track: entry.track,
      source: entry.source,
    });
  }
  return listens.sort((a, b) => b.at.getTime() - a.at.getTime());
}

export type RangeKey = "day" | "week" | "month" | "year" | "all";

const RANGE_DAYS: Record<Exclude<RangeKey, "all">, number> = {
  day: 1,
  week: 7,
  month: 30,
  year: 365,
};

export function stringParam(
  query: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = query[key];
  return typeof value === "string" ? value : undefined;
}

export function rangeParam(
  query: Record<string, unknown>,
  fallback: RangeKey,
): RangeKey {
  const raw = stringParam(query, "range");
  return raw === "all" || (raw != null && Object.hasOwn(RANGE_DAYS, raw))
    ? (raw as RangeKey)
    : fallback;
}

export function zoneParam(query: Record<string, unknown>): string {
  return parseTimeZone(stringParam(query, "tz"));
}

export function pageParams(
  query: Record<string, unknown>,
  fallbackSize: number,
): { page: number; pageSize: number } {
  const rawSize = stringParam(query, "pageSize") || stringParam(query, "limit");
  return {
    page: parsePageParam(stringParam(query, "page"), 1) ?? 1,
    pageSize: parsePageSizeParam(rawSize, fallbackSize, 100) ?? fallbackSize,
  };
}

export function limitParam(
  query: Record<string, unknown>,
  fallback: number,
  max: number,
): number {
  return parsePageSizeParam(stringParam(query, "limit"), fallback, max) ?? fallback;
}

export function rangeSince(range: RangeKey): Date | null {
  return range === "all" ? null : new Date(daysAgo(RANGE_DAYS[range]));
}

export function previousSince(range: RangeKey): Date | null {
  return range === "all" ? null : new Date(daysAgo(RANGE_DAYS[range] * 2));
}

export function inRange(listens: DemoListen[], range: RangeKey): DemoListen[] {
  const since = rangeSince(range);
  return since ? listens.filter((l) => l.at >= since) : listens;
}

export function inPreviousRange(
  listens: DemoListen[],
  range: RangeKey,
): DemoListen[] {
  const since = rangeSince(range);
  const previous = previousSince(range);
  if (!since || !previous) return [];
  return listens.filter((l) => l.at >= previous && l.at < since);
}

export function earliestAt(listens: DemoListen[]): Date | null {
  return listens.length > 0 ? listens[listens.length - 1]!.at : null;
}

export function latestAt(listens: DemoListen[]): Date | null {
  return listens.length > 0 ? listens[0]!.at : null;
}

export function pageOf<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

export function dayKeys(listens: DemoListen[], timeZone: string): string[] {
  return listens.map((l) => zonedDayKey(l.at, timeZone));
}

export function releaseTitleOf(track: DemoTrack): string | null {
  return track.albumId ? (ALBUMS_BY_ID.get(track.albumId)?.title ?? null) : null;
}

export function mostCommon<K>(values: Iterable<K>): { key: K; count: number } | null {
  const counts = new Map<K, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: { key: K; count: number } | null = null;
  for (const [key, count] of counts) {
    if (!best || count > best.count) best = { key, count };
  }
  return best;
}
