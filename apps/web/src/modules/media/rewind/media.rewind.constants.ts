export const CURRENT_YEAR = new Date().getFullYear();
export const REWIND_START_YEAR = 2010;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

/** Auto-advance interval for rewind AI insight cards. */
export const REWIND_CAROUSEL_AUTOPLAY_MS = 6000;

/** Horizontal pointer travel (px) before a gesture counts as a swipe. */
export const REWIND_CAROUSEL_SWIPE_PX = 40;

/** Cover-flow neighbor scale relative to the front card. */
export const REWIND_CAROUSEL_SIDE_SCALE = 0.7;

/** Cover-flow neighbor tilt in degrees. */
export const REWIND_CAROUSEL_SIDE_ROTATE_DEG = 6;

/** Horizontal shift of neighbor cards, as a fraction of card width. */
export const REWIND_CAROUSEL_SIDE_SHIFT = 0.3;

/** Cover-flow move duration. */
export const REWIND_CAROUSEL_TRANSITION_MS = 550;

/** Softens overflow clipping of peeking neighbor cards. */
export const REWIND_COVERFLOW_VIEWPORT_MASK =
  "linear-gradient(to right, transparent 0%, black 14%, black 86%, transparent 100%)";

/** Dissolves a left neighbor under the front card and into the page. */
export const REWIND_COVERFLOW_PREV_MASK =
  "linear-gradient(to right, transparent 0%, black 16%, black 58%, transparent 100%)";

/** Dissolves a right neighbor under the front card and into the page. */
export const REWIND_COVERFLOW_NEXT_MASK =
  "linear-gradient(to left, transparent 0%, black 16%, black 58%, transparent 100%)";
