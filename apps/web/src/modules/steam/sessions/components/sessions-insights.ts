import type {
  PlaySessionDayBucket,
  PlaySessionStats,
  PlaySessionWindowTotals,
} from "@questorylabs/shared";
import { SECONDS_PER_DAY, SESSIONS_DAYPARTS } from "../steam.sessions.constants";

export type HoursPerDayBar = {
  key: string;
  label: string;
  hours: number;
  peak: boolean;
  last: boolean;
};

export type HoursPerDayModel = {
  bars: HoursPerDayBar[];
  avgHours: number;
  peakHours: number;
  peakLabel: string | null;
};

const parseDayKey = (key: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
};

export const formatDayShort = (key: string): string => {
  const d = parseDayKey(key);
  return d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : key;
};

export const formatWeekday = (key: string): string => {
  const d = parseDayKey(key);
  return d ? d.toLocaleDateString(undefined, { weekday: "short" }) : key;
};

export const roundHours = (secs: number): number =>
  Math.round((secs / 3600) * 10) / 10;

export const hoursPerDay = (byDay: PlaySessionDayBucket[]): HoursPerDayModel => {
  const peakSecs = Math.max(0, ...byDay.map((d) => d.durationSecs));
  const peakIndex = peakSecs > 0 ? byDay.findIndex((d) => d.durationSecs === peakSecs) : -1;
  const total = byDay.reduce((sum, d) => sum + d.durationSecs, 0);
  return {
    bars: byDay.map((d, i) => ({
      key: d.day,
      label: formatDayShort(d.day),
      hours: d.durationSecs / 3600,
      peak: i === peakIndex,
      last: i === byDay.length - 1,
    })),
    avgHours: byDay.length ? total / byDay.length / 3600 : 0,
    peakHours: peakSecs / 3600,
    peakLabel: peakIndex >= 0 ? formatWeekday(byDay[peakIndex]!.day) : null,
  };
};

export const windowTotals = (stats: PlaySessionStats): PlaySessionWindowTotals => {
  if (stats.window) return stats.window;
  const sessionCount = stats.byDay.reduce((sum, d) => sum + d.sessionCount, 0);
  const totalDurationSecs = stats.byDay.reduce((sum, d) => sum + d.durationSecs, 0);
  return {
    sessionCount,
    totalDurationSecs,
    avgDurationSecs: sessionCount ? Math.round(totalDurationSecs / sessionCount) : 0,
  };
};

export const dominantDaypart = (byHour: number[] | undefined): string | null => {
  if (!byHour || byHour.length !== 24) return null;
  const total = byHour.reduce((sum, v) => sum + v, 0);
  if (total <= 0) return null;
  let best: { phrase: string; secs: number } | null = null;
  for (const part of SESSIONS_DAYPARTS) {
    const secs = part.hours.reduce<number>((sum, h) => sum + (byHour[h] ?? 0), 0);
    if (!best || secs > best.secs) best = { phrase: part.phrase, secs };
  }
  return best ? `mostly ${best.phrase}` : null;
};

export const sessionSpan = (
  startedAt: string,
  durationSecs: number,
): { left: string; width: string } => {
  const at = new Date(startedAt);
  const startSecs = Number.isFinite(at.getTime())
    ? at.getHours() * 3600 + at.getMinutes() * 60 + at.getSeconds()
    : 0;
  const width = Math.max(0, Math.min(durationSecs, SECONDS_PER_DAY - startSecs));
  return {
    left: `${((startSecs / SECONDS_PER_DAY) * 100).toFixed(2)}%`,
    width: `${((width / SECONDS_PER_DAY) * 100).toFixed(2)}%`,
  };
};

const clock = (iso: string): string =>
  new Date(iso)
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .toLowerCase();

export const formatClockRange = (startedAt: string, endedAt: string): string =>
  `${clock(startedAt)} – ${clock(endedAt)}`;

export const splitDuration = (secs: number): { hours: number; minutes: number } => {
  const mins = Math.floor(Math.max(0, secs) / 60);
  return { hours: Math.floor(mins / 60), minutes: mins % 60 };
};
