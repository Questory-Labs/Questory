import type { ReactNode } from "react";

export function MusicChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--muted)]">
      {children}
    </span>
  );
}
