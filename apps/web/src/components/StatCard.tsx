import Link from "next/link";
import { HatchShadow } from "@/components/HatchShadow";

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  delay?: number;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
          {label}
        </div>
        {href && (
          <span
            className="mt-0.5 text-[var(--faint)] group-hover:text-[var(--accent)]"
            aria-hidden
          >
            →
          </span>
        )}
      </div>
      <div
        className="font-mono mt-3 text-3xl tracking-tight text-[var(--ink)] tabular-nums"
        style={{ fontWeight: 500 }}
      >
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs leading-snug text-[var(--faint)]">{hint}</div>
      )}
    </>
  );

  return (
    <HatchShadow
      className="h-full"
      faceClassName={`panel group h-full p-4 hover:border-[var(--line-strong)] ${
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
    </HatchShadow>
  );
}
