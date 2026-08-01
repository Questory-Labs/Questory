"use client";

import { useEffect, useState } from "react";
import {
  pickTaglineIndex,
  taglinePool,
  type StatusTagline,
  type TaglineContext,
} from "@/lib/status-taglines";

export const TAGLINE_ROTATE_INTERVAL_MS = 6000;

/**
 * Random tagline for a status context. Picks client-side only (avoids SSR
 * hydration mismatch), so the first render returns `null`.
 *
 * With `rotate: true` the tagline advances on an interval, never repeating
 * the current one back-to-back.
 */
export function useRotatingTagline(
  context: TaglineContext,
  {
    rotate = true,
    intervalMs = TAGLINE_ROTATE_INTERVAL_MS,
  }: { rotate?: boolean; intervalMs?: number } = {},
): StatusTagline | null {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    setIndex(pickTaglineIndex(context));
  }, [context]);

  useEffect(() => {
    if (!rotate) return;
    const timer = setInterval(() => {
      setIndex((prev) => pickTaglineIndex(context, prev ?? undefined));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [rotate, intervalMs, context]);

  return index === null ? null : taglinePool(context)[index];
}
