"use client";

import { Panel } from "@/components/ui";

export const MiniStat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone?: "warm" | "danger";
}) => {
  const toneClass =
    tone === "danger"
      ? "text-[var(--danger)]"
      : tone === "warm"
        ? "text-[var(--warm)]"
        : "text-[var(--ink)]";
  const showTone = value != null && value > 0;
  return (
    <Panel className="p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {label}
      </div>
      <div
        className={`mt-1 text-xl tabular-nums ${
          showTone ? toneClass : "text-[var(--ink)]"
        }`}
      >
        {value ?? "—"}
      </div>
    </Panel>
  );
};
