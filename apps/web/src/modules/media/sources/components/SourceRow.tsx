import type { ReactNode } from "react";
import { cn } from "@questorylabs/ui";

export type SourceTone = "ok" | "idle" | "warn";

const TONE_COLOR: Record<SourceTone, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  idle: "var(--faint)",
};

export const SourceStatusPill = ({ tone, children }: { tone: SourceTone; children: ReactNode }) => (
  <span
    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-[3px] text-[11px]"
    style={{ color: TONE_COLOR[tone] }}
  >
    {children}
  </span>
);

export const SourceRow = ({
  label,
  title,
  blurb,
  status,
  tone,
  action,
  children,
}: {
  label?: string;
  title: string;
  blurb: ReactNode;
  status?: ReactNode;
  tone?: SourceTone;
  action?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="q-lift flex flex-wrap items-start gap-x-[18px] gap-y-3.5 rounded-[22px] border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] px-5 py-[18px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
    <span
      aria-hidden="true"
      className="relative grid h-[46px] w-[46px] flex-none place-items-center rounded-full border border-white/[0.12] bg-black/30 text-lg font-normal text-[var(--source-accent,var(--ink))]"
    >
      {title.slice(0, 1).toUpperCase()}
      {tone ? (
        <span
          className={cn(
            "absolute bottom-0 right-0 h-[9px] w-[9px] rounded-full border-2 border-[#121214]",
            tone === "ok" && "q-live",
          )}
          style={{ background: TONE_COLOR[tone] }}
        />
      ) : null}
    </span>
    <div className="min-w-0 flex-[1_1_280px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="m-0 text-[17px] font-normal text-[var(--ink)]">{title}</h3>
        {status}
        {label ? <span className="label-mono text-[10px] text-[var(--faint)]">{label}</span> : null}
      </div>
      <div className="mt-[3px] text-sm text-[var(--muted)]">{blurb}</div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
    {action ? <div className="flex flex-wrap items-center gap-2 self-center">{action}</div> : null}
  </div>
);
