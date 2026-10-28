import type { ReactNode } from "react";
import { cn } from "@questorylabs/ui";
import { Panel } from "@/components/ui";

export type KpiTone = "ok" | "music" | "warn" | "muted";

const TONE_CLASS: Record<KpiTone, string> = {
  ok: "text-[var(--ok)]",
  music: "text-[var(--music)]",
  warn: "text-[var(--warn)]",
  muted: "text-[var(--muted)]",
};

export const MusicKpiTile = ({
  label,
  value,
  unit,
  note,
  tone = "muted",
  aside,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  tone?: KpiTone;
  aside?: ReactNode;
}) => (
  <Panel size="sm" wrapperClassName="h-full" className="q-lift h-full px-[18px] py-4">
    <p className="text-[13px] text-[var(--muted)]">{label}</p>
    <div className="mt-1.5 flex items-end justify-between gap-3">
      <p className="truncate text-[40px] font-extralight leading-none tracking-[-0.04em] text-[var(--ink)]">
        {value}
        {unit ? (
          <span className="text-[13px] tracking-normal text-[var(--faint)]">{unit}</span>
        ) : null}
      </p>
      {aside ? <div className="shrink-0 pb-0.5">{aside}</div> : null}
    </div>
    {note ? <p className={cn("mt-1.5 text-xs", TONE_CLASS[tone])}>{note}</p> : null}
  </Panel>
);
