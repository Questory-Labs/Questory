import { zonedHour, zonedWeekday } from "../../lib/timezone";

export const DOW_MON_LABELS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

export type HeatmapPoint = {
  at: Date;
  count: number;
};

export type HourDowHeatmap = {
  dayLabels: string[];
  hourLabels: string[];
  cells: Array<{ day: number; hour: number; count: number }>;
  maxCount: number;
};

/** Sunday-based weekday (0–6) → Monday-first index (0 = Mon). */
export function sunWeekdayToMonFirst(sunWeekday: number): number {
  return (sunWeekday + 6) % 7;
}

export function hourLabel(hour: number): string {
  const h12 = hour % 12 || 12;
  const suffix = hour < 12 ? "am" : "pm";
  return `${h12}${suffix}`;
}

/** Build a dense 7×24 Mon-first listen matrix from timestamped counts. */
export function buildHourDowHeatmap(
  points: HeatmapPoint[],
  timeZone: string,
): HourDowHeatmap {
  const matrix = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );
  for (const point of points) {
    const day = sunWeekdayToMonFirst(zonedWeekday(point.at, timeZone));
    const hour = zonedHour(point.at, timeZone);
    matrix[day][hour] += point.count;
  }

  let maxCount = 0;
  const cells: Array<{ day: number; hour: number; count: number }> = [];
  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const count = matrix[day][hour];
      if (count > maxCount) maxCount = count;
      cells.push({ day, hour, count });
    }
  }

  return {
    dayLabels: [...DOW_MON_LABELS],
    hourLabels: Array.from({ length: 24 }, (_, hour) => hourLabel(hour)),
    cells,
    maxCount,
  };
}
