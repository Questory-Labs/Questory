"use client";

import { useMemo } from "react";

export const MoodTagCloud = ({
  moods,
}: {
  moods: Array<{ id: string; name: string; count: number }>;
}) => {
  const { min, max } = useMemo(() => {
    const counts = moods.map((m) => m.count);
    return {
      min: Math.min(...counts),
      max: Math.max(...counts),
    };
  }, [moods]);

  return (
    <section className="mt-8">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        Moods
      </h2>
      <div className="mt-3 flex h-[250px] flex-wrap content-center items-center justify-center gap-x-3 gap-y-2 overflow-hidden rounded border border-[var(--line)] bg-[var(--bg-1)] px-4 py-3">
        {moods.map((m) => {
          const ratio = max === min ? 1 : (m.count - min) / (max - min);
          const fontSize = 0.75 + ratio * 1.1;
          const opacity = 0.55 + ratio * 0.45;
          return (
            <span
              key={m.id}
              title={`${m.count} listens`}
              className="font-display font-semibold leading-tight text-[var(--ink)] transition-colors hover:text-[var(--accent)]"
              style={{ fontSize: `${fontSize}rem`, opacity }}
            >
              {m.name}
            </span>
          );
        })}
      </div>
    </section>
  );
};
