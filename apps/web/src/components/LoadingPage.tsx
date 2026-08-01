"use client";

import { useEffect } from "react";
import { BrandMark } from "@/components/BrandMark";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";
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

  const panel = (
    <>
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--muted)]">
        {eyebrow}
      </p>

      <HatchShadow
        className="mt-5 max-w-lg"
        size="lg"
        faceClassName="panel border border-[var(--accent)]/20 bg-[var(--accent-dim)] px-6 py-8 sm:px-8"
      >
        <div
          className="flex gap-2"
          role="status"
          aria-live="polite"
          aria-label={title}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="hatch-fill h-2 flex-1 motion-safe:animate-pulse"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
        <h1 className="mt-5 font-display text-3xl tracking-tight text-[var(--ink)] sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-3 text-[var(--muted)]">{description}</p>
        ) : (
          <RotatingTagline context="loading" className="mt-3" />
        )}
      </HatchShadow>

      {logLine ? (
        <p className="mt-8 max-w-lg font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
          {logLine}
        </p>
      ) : null}
    </>
  );

  if (layout === "embedded") {
    return <section aria-busy="true">{panel}</section>;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" className="mb-10" />
        {panel}
      </div>
    </div>
  );
}
