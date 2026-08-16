/** Tunable constants for shared chart components. */

/** GitHub-style calendar: last N weeks when the span is longer. */
export const CALENDAR_HEATMAP_MAX_WEEKS = 53;

/** Hour axis tick stride on the 7×24 listening-clock heatmap. */
export const HEATMAP_HOUR_TICK_STEP = 3;

/** Gap between a hovered chart cell and its tooltip, in px. */
export const CHART_TOOLTIP_GAP_PX = 8;

/** Space between week columns inside a month. */
export const CALENDAR_WEEK_GAP_CLASS = "ml-0.5";

/** Extra space before the first week of a new month. */
export const CALENDAR_MONTH_GAP_CLASS = "ml-3";

/** Ranges long enough for a daily calendar (day/week stay on the clock). */
export const CALENDAR_HEATMAP_RANGES = new Set(["month", "year", "all"]);
