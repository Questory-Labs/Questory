import {
  PLAY_SESSION_STATS_DAY_OPTIONS,
  type PlaySessionStatsDays,
} from "@questorylabs/shared";

export type SessionsRange = `${PlaySessionStatsDays}`;

export const SESSIONS_DEFAULT_RANGE: SessionsRange = "14";

export const SESSIONS_RANGE_OPTIONS: readonly { value: SessionsRange; label: string }[] =
  PLAY_SESSION_STATS_DAY_OPTIONS.map((d) => ({
    value: String(d) as SessionsRange,
    label: `${d} d`,
  }));

export const SESSIONS_DAYPARTS = [
  { phrase: "in the morning", hours: [5, 6, 7, 8, 9, 10, 11] },
  { phrase: "in the afternoon", hours: [12, 13, 14, 15, 16] },
  { phrase: "in the evening", hours: [17, 18, 19, 20] },
  { phrase: "after dark", hours: [21, 22, 23, 0, 1, 2, 3, 4] },
] as const;

export const SESSIONS_AXIS_TICKS = ["00", "06", "12", "18", "24"] as const;

export const SESSIONS_DENSE_BAR_THRESHOLD = 30;

export const SECONDS_PER_DAY = 86_400;
