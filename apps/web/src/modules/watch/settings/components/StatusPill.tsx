import type { ReactNode } from "react";

export const StatusPill = ({
  tone,
  children,
}: {
  tone: "ok" | "idle" | "warn";
  children: ReactNode;
}) => {
  const cls =
    tone === "ok"
      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
      : tone === "warn"
        ? "bg-[var(--bg-3)] text-[var(--ink)]"
        : "bg-[var(--bg-2)] text-[var(--faint)]";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${cls}`}
    >
      {children}
    </span>
  );
};
