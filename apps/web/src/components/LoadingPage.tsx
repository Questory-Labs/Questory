"use client";

import { useEffect, useMemo } from "react";
import { BrandMark } from "@/components/BrandMark";
import { DotCanvas } from "@/components/dots/DotCanvas";
import { createRingPainter, GLYPH_GRID } from "@/components/dots/dot-painters";
import { RotatingTagline } from "@/components/RotatingTagline";

export function LoadingPage({
  eyebrow = "Please hold",
  title = "Syncing your quest log",
  description,
  logLine = "quest log › hydrate — status: in_progress",
  layout = "full",
}: {
  eyebrow?: string;
  title?: string;
  /** Fixed copy override; omit to show a rotating iconic quote instead. */
  description?: string;
  logLine?: string;
  layout?: "full" | "embedded";
}) {
  useEffect(() => {
    if (layout !== "full") return;
    document.documentElement.classList.add("landing-active");
    return () => document.documentElement.classList.remove("landing-active");
  }, [layout]);

  const paint = useMemo(() => createRingPainter(), []);

  const panel = (
    <div className="mx-auto w-full max-w-[560px] text-center">
      <div
        role="status"
        aria-live="polite"
        aria-label={title}
        className="panel relative grid h-[220px] place-items-center overflow-hidden"
      >
        <DotCanvas
          paint={paint}
          width={GLYPH_GRID.w * GLYPH_GRID.step}
          height={GLYPH_GRID.h * GLYPH_GRID.step}
          className="w-[360px] max-w-[90%]"
        />
        <p className="absolute bottom-3.5 m-0 font-mono text-[11px] uppercase tracking-[0.08em] text-[var(--faint)]">
          {eyebrow}
        </p>
      </div>
      <h1 className="q-in mt-6 mb-0 text-[clamp(28px,3.4vw,40px)] font-light leading-[1.05] tracking-[-0.045em] text-[var(--ink)] [--i:1]">
        {title}
      </h1>
      <div className="q-in mx-auto mt-3 max-w-[440px] text-[#8d8d92] [--i:2]">
        {description ? (
          <p className="m-0">{description}</p>
        ) : (
          <RotatingTagline context="loading" />
        )}
      </div>
      {logLine ? (
        <p className="mx-auto mt-8 max-w-lg font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--dim)]">
          {logLine}
        </p>
      ) : null}
    </div>
  );

  if (layout === "embedded") {
    return (
      <section aria-busy="true" className="px-4 pt-6 pb-16">
        {panel}
      </section>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-0)] text-[var(--ink)]">
      <header className="px-6 pt-6">
        <BrandMark href="/" size="sm" wordmarkClassName="text-lg" />
      </header>
      <main className="grid flex-1 place-items-center px-4 pt-6 pb-16">
        {panel}
      </main>
    </div>
  );
}
