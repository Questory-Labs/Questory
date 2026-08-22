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
