"use client";

import type { SketchDatum } from "./types";

/** Tiny inline chart with no axes — scaffold for StatCards and table rows. */
export function Sparkline({
  data: _data,
}: {
  data: number[] | SketchDatum[];
  ariaLabel?: string;
  width?: number;
  height?: number;
}) {
  return null;
}
