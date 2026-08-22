import type { ReactNode } from "react";
import { Panel } from "@/components/ui";

export const SourceCard = ({
  label,
  title,
  blurb,
  status,
  children,
}: {
  label: string;
  title: string;
  blurb: string;
  status: ReactNode;
  children?: ReactNode;
}) => (
  <Panel wrapperClassName="h-full" className="flex h-full flex-col p-5">
    <div className="flex items-start justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
        {label}
      </span>
      {status}
    </div>
    <h2 className="mt-3 font-display text-xl font-bold tracking-tight text-[var(--ink)]">
      {title}
    </h2>
    <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{blurb}</p>
    {children ? <div className="mt-auto pt-5">{children}</div> : null}
  </Panel>
);
