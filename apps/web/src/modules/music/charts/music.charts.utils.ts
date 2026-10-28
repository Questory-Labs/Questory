import type { MusicMoversResponse, MusicRange } from "@questorylabs/shared";
import { RANGE_PREVIOUS } from "../music.utils";
import { CHART_KINDS, type TopsKind } from "./music.charts.constants";

export const entityHref = (kind: TopsKind, id: string): string | null => {
  if (kind === "artists") return `/music/artists/${id}`;
  if (kind === "albums") return `/music/albums/${id}`;
  if (kind === "tracks") return `/music/tracks/${id}`;
  return null;
};

export const parseKind = (raw: string | null): TopsKind => {
  if (CHART_KINDS.some((k) => k.value === raw)) return raw as TopsKind;
  return "artists";
};

export const moverBadge = (isNew: boolean, delta: number | null) => {
  if (isNew) return { text: "New", up: true };
  const n = delta ?? 0;
  return { text: `${n > 0 ? "▲" : "▼"} ${Math.abs(n)}`, up: n > 0 };
};

export const concentrationSentence = (
  data: MusicMoversResponse,
  kindLabel: string,
  range: MusicRange,
) => {
  const { topN, share, previousShare } = data.concentration;
  const head = `Your top ${topN} ${kindLabel} make up ${share}% of listens`;
  const previous = RANGE_PREVIOUS[range];
  if (previousShare == null || !previous) return `${head}.`;
  if (previousShare === share) return `${head}, same as ${previous}.`;
  return `${head}, ${share > previousShare ? "up" : "down"} from ${previousShare}% ${previous}.`;
};
