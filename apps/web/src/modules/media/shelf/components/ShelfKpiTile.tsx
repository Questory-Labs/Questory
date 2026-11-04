import type { ReactNode } from "react";
import { cn } from "@questorylabs/ui";
import { Panel } from "@/components/ui";

export type ShelfTone = "ok" | "danger" | "muted";

const TONE: Record<ShelfTone, string> = {
  ok: "text-[var(--ok)]",
  danger: "text-[var(--danger)]",
  muted: "text-[var(--muted)]",
};

export const deltaTone = (delta: number | null | undefined): ShelfTone =>
  delta == null ? "muted" : delta >= 0 ? "ok" : "danger";

export const ShelfKpiTile = ({
  label,
  value,
  unit,
  note,
  tone = "muted",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  tone?: ShelfTone;
}) => (
  <Panel size="sm" wrapperClassName="h-full" className="q-lift h-full px-[18px] py-4">
    <p className="text-[13px] text-[var(--muted)]">{label}</p>
    <p className="mt-1.5 truncate text-[40px] font-extralight leading-none tracking-[-0.04em] text-[var(--ink)]">
      {value}
      {unit ? <span className="text-[13px] tracking-normal text-[var(--faint)]">{unit}</span> : null}
    </p>
    {note ? <p className={cn("mt-1.5 text-xs", TONE[tone])}>{note}</p> : null}
  </Panel>
);
