import type { DonutDatum } from "@/components/charts/types";

const MIX_COLORS = ["#7dd3c0", "#8a7f9a", "#c4a35a", "#c47c6c"];

/**
 * Exclusive donut slices that must sum to `whole`. Nested counts (e.g.
 * near-complete inside played) are ignored — do not pass them as slices.
 */
export const partitionMix = (
  whole: number,
  exclusive: Array<{ name: string; value: number; color?: string }>,
): DonutDatum[] => {
  const used = exclusive.reduce((sum, part) => sum + Math.max(0, part.value), 0);
  if (used > whole) {
    throw new Error(`partitionMix: exclusive parts (${used}) exceed whole (${whole})`);
  }
  const remainder = whole - used;
  const slices: DonutDatum[] = [];
  if (remainder > 0) {
    slices.push({
      name: "Played",
      value: remainder,
      color: MIX_COLORS[0],
    });
  }
  exclusive.forEach((part, i) => {
    if (part.value <= 0) return;
    slices.push({
      name: part.name,
      value: part.value,
      color: part.color ?? MIX_COLORS[(i + 1) % MIX_COLORS.length],
    });
  });
  return slices;
};

/** Steam library mix: played vs unplayed. `nearComplete` is nested — omitted. */
export const libraryPlayMix = (
  librarySize: number,
  unplayedCount: number,
  _nearComplete = 0,
): DonutDatum[] => {
  const unplayed = Math.max(0, Math.min(unplayedCount, librarySize));
  return partitionMix(librarySize, [{ name: "Unplayed", value: unplayed }]);
};
