import {
  PRICE_CHART_HEIGHT,
  PRICE_CHART_PAD,
  PRICE_CHART_WIDTH,
  SESSION_BAR_MIN_PCT,
} from "./steam.library-game.constants";

export const formatMinutes = (minutes: number) => {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (!h) return `${rest}m`;
  return rest ? `${h}h ${rest}m` : `${h}h`;
};

export type SessionBar = { date: string; minutes: number; height: number };

export const sessionBars = (days: { date: string; minutes: number }[]): SessionBar[] => {
  const max = Math.max(0, ...days.map((d) => d.minutes));
  return days.map((d) => ({
    date: d.date,
    minutes: d.minutes,
    height:
      max > 0 && d.minutes > 0
        ? Math.max(SESSION_BAR_MIN_PCT, Math.round((d.minutes / max) * 100))
        : 0,
  }));
};

export type HltbRow = { label: string; hours: number; width: number };

export const hltbRows = (
  hltb: {
    mainHours: number | null;
    extraHours: number | null;
    completionistHours: number | null;
  } | null | undefined,
  youHours: number,
): { rows: HltbRow[]; youWidth: number } | null => {
  if (!hltb) return null;
  const raw = [
    { label: "Main story", hours: hltb.mainHours },
    { label: "Main + extras", hours: hltb.extraHours },
    { label: "Completionist", hours: hltb.completionistHours },
  ].filter((r): r is { label: string; hours: number } => r.hours != null && r.hours > 0);
  if (!raw.length) return null;
  const scale = Math.max(youHours, ...raw.map((r) => r.hours));
  const pct = (n: number) => (scale > 0 ? Math.round((n / scale) * 100) : 0);
  return {
    rows: raw.map((r) => ({ ...r, width: pct(r.hours) })),
    youWidth: pct(youHours),
  };
};

export type PriceSteps = {
  path: string;
  lowY: number;
  low: { x: number; y: number };
  min: number;
  max: number;
};

export const priceSteps = (
  history: { date: string; price: number }[],
): PriceSteps | null => {
  const points = history
    .map((h) => ({ t: new Date(h.date).getTime(), price: h.price }))
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.price))
    .sort((a, b) => a.t - b.t);
  if (points.length < 2) return null;
  const t0 = points[0].t;
  const span = Math.max(1, points[points.length - 1].t - t0);
  const min = Math.min(...points.map((p) => p.price));
  const max = Math.max(...points.map((p) => p.price));
  const range = max - min || 1;
  const inner = PRICE_CHART_HEIGHT - PRICE_CHART_PAD * 2;
  const x = (t: number) => Math.round(((t - t0) / span) * PRICE_CHART_WIDTH);
  const y = (p: number) =>
    Math.round(PRICE_CHART_PAD + (1 - (p - min) / range) * inner);
  let path = `M0 ${y(points[0].price)}`;
  for (let i = 1; i < points.length; i += 1) {
    path += `H${x(points[i].t)}V${y(points[i].price)}`;
  }
  path += `H${PRICE_CHART_WIDTH}`;
  const lowPoint = points.find((p) => p.price === min) ?? points[0];
  return {
    path,
    lowY: y(min),
    low: { x: x(lowPoint.t), y: y(min) },
    min,
    max,
  };
};
