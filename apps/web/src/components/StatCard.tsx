import Link from "next/link";
import { Panel } from "@/components/ui/Panel";

/** Compact metric tile — hatch-elevated Panel shared across Steam, Music, and Watch. */
export function StatCard({
  label,
  value,
  hint,
  href,
  className = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
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
      <div className="mt-1 truncate text-xl tabular-nums text-[var(--ink)]">
        {value}
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
