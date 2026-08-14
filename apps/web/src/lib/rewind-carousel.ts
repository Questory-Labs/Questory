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

/** Shortest wrapped offset of a slide from the current index. */
export function rewindCoverflowOffset(slideIndex: number, current: number, count: number): number {
  if (count <= 0) return 0;
  let diff = slideIndex - current;
  const half = count / 2;
  if (diff > half) diff -= count;
  if (diff < -half) diff += count;
  return diff;
}

export function rewindCoverflowTransform(offset: number, reducedMotion: boolean): string {
  if (offset === 0) return "translate3d(0,0,0) scale(1) rotate(0deg)";
  const dir = Math.sign(offset);
  const far = Math.abs(offset) > 1;
  const shift = dir * REWIND_CAROUSEL_SIDE_SHIFT * (far ? 1.35 : 1);
  const scale = REWIND_CAROUSEL_SIDE_SCALE * (far ? 0.88 : 1);
  const rotate = reducedMotion ? 0 : dir * REWIND_CAROUSEL_SIDE_ROTATE_DEG * (far ? 1.2 : 1);
  return `translate3d(${shift * 100}%,0,0) scale(${scale}) rotate(${rotate}deg)`;
}
