import type { MusicHeatmap, MusicTimeBucket } from "@questorylabs/shared";

export const DAILY_CHART_WIDTH = 900;
export const DAILY_CHART_HEIGHT = 140;
export const DAILY_CHART_TICKS = 7;
export const DAILY_CHART_PEAKS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

const parseDayKey = (key: string) => Date.parse(`${key}T00:00:00Z`);

const dayKeyOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const formatDayTick = (key: string) =>
  new Date(parseDayKey(key)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

export const fillDays = (buckets: MusicTimeBucket[]): MusicTimeBucket[] => {
  const valid = buckets.filter((b) => Number.isFinite(parseDayKey(b.key)));
  if (valid.length === 0) return [];
  const byKey = new Map(valid.map((b) => [b.key, b]));
  const sorted = [...byKey.keys()].sort();
  const start = parseDayKey(sorted[0]);
  const end = parseDayKey(sorted[sorted.length - 1]);
  const out: MusicTimeBucket[] = [];
  for (let t = start; t <= end; t += DAY_MS) {
    const key = dayKeyOf(t);
    out.push(byKey.get(key) ?? { key, label: key, count: 0, minutes: 0 });
  }
  return out;
};

export type DailyLine = {
  path: string;
  points: Array<{ x: number; y: number; key: string; count: number }>;
  peaks: Array<{ x: number; y: number; key: string; count: number }>;
  ticks: Array<{ x: number; label: string }>;
  targetY: number | null;
  quietDays: number;
  quietPaths: string[];
};

export const buildDailyLine = (
  buckets: MusicTimeBucket[],
  target: number | null = null,
): DailyLine | null => {
  const days = fillDays(buckets);
  if (days.length < 2) return null;
  const max = Math.max(1, ...days.map((d) => d.count), target ?? 0) * 1.1;
  const step = DAILY_CHART_WIDTH / (days.length - 1);
  const yOf = (v: number) =>
    +(DAILY_CHART_HEIGHT - (v / max) * DAILY_CHART_HEIGHT).toFixed(1);
  const points = days.map((d, i) => ({
    x: +(i * step).toFixed(1),
    y: yOf(d.count),
    key: d.key,
    count: d.count,
  }));
  const toPath = (pts: typeof points) =>
    pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join("");
  const peaks = [...points]
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, DAILY_CHART_PEAKS);
  const tickEvery = Math.max(1, Math.ceil((days.length - 1) / (DAILY_CHART_TICKS - 1)));
  const ticks = points
    .filter((_, i) => i % tickEvery === 0)
    .map((p) => ({ x: p.x, label: formatDayTick(p.key) }));

  const quietPaths: string[] = [];
  let quietDays = 0;
  if (target != null && target > 0) {
    let run: number[] = [];
    const flush = () => {
      if (run.length === 0) return;
      const from = Math.max(0, run[0] - 1);
      const to = Math.min(points.length - 1, run[run.length - 1] + 1);
      quietPaths.push(toPath(points.slice(from, to + 1)));
      run = [];
    };
    points.forEach((p, i) => {
      if (p.count < target) {
        quietDays += 1;
        run.push(i);
      } else {
        flush();
      }
    });
    flush();
  }

  return {
    path: toPath(points),
    points,
    peaks,
    ticks,
    targetY: target != null && target > 0 ? yOf(target) : null,
    quietDays,
    quietPaths,
  };
};

export type DotCell = {
  key: string;
  size: number;
  color: string;
  tip: string;
  index: number;
};

export const clockHour = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export const buildDotHeatmap = (heatmap: MusicHeatmap | undefined) => {
  const dayLabels = heatmap?.dayLabels ?? [];
  const max = heatmap?.maxCount ?? 0;
  const counts = new Map<string, number>();
  for (const cell of heatmap?.cells ?? []) {
    counts.set(`${cell.day}-${cell.hour}`, cell.count);
  }
  let peak: { day: number; hour: number; count: number } | null = null;
  let index = 0;
  const rows = dayLabels.map((label, day) => ({
    label,
    cells: Array.from({ length: 24 }, (_, hour): DotCell => {
      const count = counts.get(`${day}-${hour}`) ?? 0;
      if (count > 0 && (!peak || count > peak.count)) {
        peak = { day, hour, count };
      }
      const v = max > 0 ? count / max : 0;
      return {
        key: `${day}-${hour}`,
        size: +(4 + v * 9).toFixed(1),
        color:
          v > 0.85
            ? "rgba(240,168,184,0.95)"
            : `rgba(237,237,238,${(0.15 + v * 0.75).toFixed(2)})`,
        tip: `${label} ${clockHour(hour)} · ${count} ${count === 1 ? "play" : "plays"}`,
        index: index++,
      };
    }),
  }));
  const found = peak as { day: number; hour: number; count: number } | null;
  return {
    rows,
    peakLabel: found ? `${dayLabels[found.day]} ${clockHour(found.hour)}` : null,
  };
};
