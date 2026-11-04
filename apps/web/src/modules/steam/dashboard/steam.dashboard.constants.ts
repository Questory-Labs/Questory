export type DashboardTimeRange = "today" | "week" | "month";

export const DASHBOARD_TIME_RANGES: readonly { value: DashboardTimeRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export const DASHBOARD_DEFAULT_TIME_RANGE: DashboardTimeRange = "week";

export const DASHBOARD_GREETINGS = [
  { from: 5, label: "Good morning" },
  { from: 12, label: "Good afternoon" },
  { from: 17, label: "Good evening" },
  { from: 22, label: "Good night" },
] as const;

export const DASHBOARD_GOALS_LIMIT = 3;

export const DASHBOARD_CHART = {
  width: 700,
  height: 180,
  peakCount: 3,
  bandWidth: 22,
} as const;

export const DASHBOARD_HOURS_PER_DAY = 24;
export const DASHBOARD_DAYS_PER_WEEK = 7;
export const DASHBOARD_MONDAY_REFERENCE = new Date(2024, 0, 1);
export const DASHBOARD_TODAY_TICKS = [0, 6, 12, 18] as const;

export const NOW_CARD_COLOR = {
  games: "var(--games)",
  music: "var(--music)",
  watch: "var(--watch)",
  read: "var(--read)",
} as const;
