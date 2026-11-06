"use client";

import { useEffect, useState } from "react";

const TICK_MS = 1_000;

export function useDemoTimeLeft(expiresAt: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const left = Date.parse(expiresAt ?? "") - now;
  const expired = !(left > 0);
  return {
    expired,
    minutesLeft: expired ? 0 : Math.ceil(left / 60_000),
  };
}
