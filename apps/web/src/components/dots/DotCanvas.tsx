"use client";

import { useEffect, useRef } from "react";
import type { DotPainter } from "./dot-painters";

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const context2d = (canvas: HTMLCanvasElement | null) => {
  if (!canvas || typeof canvas.getContext !== "function") return null;
  try {
    return canvas.getContext("2d");
  } catch {
    return null;
  }
};

export function DotCanvas({
  paint,
  width,
  height,
  className = "",
  label,
  staticTime = 0.5,
}: {
  paint: DotPainter;
  width: number;
  height: number;
  className?: string;
  label?: string;
  staticTime?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const ctx = context2d(ref.current);
    if (!ctx) return;
    if (prefersReducedMotion()) {
      paint(ctx, staticTime);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const loop = (ts: number) => {
      paint(ctx, Math.max(0, ts - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paint, staticTime]);

  if (label) {
    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        role="img"
        aria-label={label}
        className={`block h-auto ${className}`}
      />
    );
  }

  return (
    <canvas
      ref={ref}
      width={width}
      height={height}
      aria-hidden
      className={`block h-auto ${className}`}
    />
  );
}
