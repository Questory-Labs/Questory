/** Tunable dashboard snippet sizes. */

/** Recent listens / watches / reads pulled onto the home dashboard. */
export const DASHBOARD_SNIPPET_SIZE = 5;

/** Unified activity feed cap after merge/sort. */
export const DASHBOARD_ACTIVITY_LIMIT = 8;

/** QEngine Mix picks shown beside play-next. */
export const DASHBOARD_RECS_LIMIT = 4;

/** Play-next tiles requested from the API. Continue game is filtered client-side. */
export const DASHBOARD_PLAY_NEXT_LIMIT = 3;

/** Home glance insights window. Must match the dashboard controller fetch. */
export const DASHBOARD_INSIGHTS_RANGE = "week" as const;

export const DASHBOARD_RANGE_LABELS = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
  year: "Last 365 days",
  all: "All time",
} as const;

export const dashboardRangeLabel = (
  range?: string | null,
): string =>
  range && range in DASHBOARD_RANGE_LABELS
    ? DASHBOARD_RANGE_LABELS[range as keyof typeof DASHBOARD_RANGE_LABELS]
    : DASHBOARD_RANGE_LABELS[DASHBOARD_INSIGHTS_RANGE];
