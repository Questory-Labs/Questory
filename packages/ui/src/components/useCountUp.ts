import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window === "undefined" ||
  typeof window.matchMedia !== "function" ||
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export const useCountUp = (target: number, duration = 1600) => {
  const [value, setValue] = useState(() =>
    prefersReducedMotion() ? target : 0,
  );
  const fromRef = useRef(value);

  useEffect(() => {
    if (prefersReducedMotion() || typeof requestAnimationFrame !== "function") {
      fromRef.current = target;
      setValue(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = from + (target - from) * easeOutCubic(t);
      fromRef.current = next;
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
};
