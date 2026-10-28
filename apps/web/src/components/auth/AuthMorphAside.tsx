"use client";

import { DotCanvas, prefersReducedMotion } from "@/components/dots/DotCanvas";
import {
  createMorphPainter,
  MORPH_GRID,
  MORPH_PERIOD_SEC,
} from "@/components/dots/dot-painters";
import { useEffect, useMemo, useState } from "react";
import { AuthStatusLine, useInstanceHost } from "./AuthSplitLayout";

const MODULES = [
  { label: "Games", dot: "text-[var(--games)]" },
  { label: "Music", dot: "text-[var(--music)]" },
  { label: "Watch", dot: "text-[var(--watch)]" },
  { label: "Read", dot: "text-[var(--read)]" },
] as const;

export function useMorphIndex(count: number) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      MORPH_PERIOD_SEC * 1000,
    );
    return () => window.clearInterval(id);
  }, [count]);
  return index;
}

export function AuthMorphAside() {
  const paint = useMemo(() => createMorphPainter(), []);
  const active = useMorphIndex(MODULES.length);
  const host = useInstanceHost();

  return (
    <>
      <DotCanvas
        paint={paint}
        width={MORPH_GRID.w * MORPH_GRID.step}
        height={MORPH_GRID.h * MORPH_GRID.step}
        className="relative mx-auto w-full max-w-[620px]"
      />
      <div className="relative">
        <p className="m-0 text-[clamp(32px,3.8vw,52px)] font-light leading-[1.02] tracking-[-0.045em]">
          Everything you play, hear, watch{" "}
          <span className="font-serif text-[#a1a1a6]">and read.</span>
        </p>
        <ul aria-label="Modules" className="mt-[22px] flex flex-wrap gap-2 p-0">
          {MODULES.map((m, i) => {
            const on = i === active;
            return (
              <li
                key={m.label}
                aria-current={on || undefined}
                className={`inline-flex min-h-[34px] items-center gap-2 rounded-full border px-3.5 text-[13px] transition-colors duration-500 ${
                  on
                    ? "border-[var(--line-strong)] bg-white/[0.08] text-[var(--ink)]"
                    : "border-[var(--line)] bg-transparent text-[var(--muted)]"
                }`}
              >
                <span
                  aria-hidden
                  className={`dot ${m.dot} ${on ? "shadow-[0_0_10px_currentColor]" : ""}`}
                />
                {m.label}
              </li>
            );
          })}
        </ul>
      </div>
      <AuthStatusLine>
        {host ? `Self-hosted at ${host}` : "Self-hosted"}
      </AuthStatusLine>
    </>
  );
}
