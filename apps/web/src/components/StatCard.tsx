import type { ReactNode } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

/** Compact metric tile — hatch-elevated Panel. No prestige/lg size. */
export function StatCard({
  label,
  value,
  hint,
  href,
  sparkline,
  className = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  sparkline?: ReactNode;
  /** @deprecated No-op; kept for call-site compatibility. */
  delay?: number;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
          {label}
        </div>
        {href ? (
          <span
            className="mt-0.5 text-[var(--faint)] group-hover:text-[var(--accent)]"
            aria-hidden
          >
            →
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="truncate text-xl tabular-nums text-[var(--ink)]">
          {value}
        </div>
        {sparkline ? <div className="shrink-0 pb-0.5">{sparkline}</div> : null}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
          {hint}
        </div>
      ) : null}
    </>
  );

  return (
    <Panel
      size="sm"
      wrapperClassName={`h-full ${className}`.trim()}
      className={`group h-full p-3 hover:border-[var(--line-strong)] ${
        href ? "cursor-pointer" : ""
      }`}
    >
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </Panel>
  );
}
