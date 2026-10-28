"use client";

import { useEffect, useState } from "react";
import { playbackProgress } from "../music.utils";

export const usePlaybackClock = (
  startedAt: string | null | undefined,
  durationMs: number | null | undefined,
) => {
  const active = Boolean(startedAt && durationMs && durationMs > 0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active, startedAt]);

  return active ? playbackProgress(startedAt!, durationMs!, now) : null;
};
