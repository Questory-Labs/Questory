import type { ReactNode } from "react";
import { Panel } from "@/components/ui";

export function MusicStatusPill({
  tone,
  children,
}: {
  tone: "ok" | "idle" | "warn";
  children: ReactNode;
}) {
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
}

export function MusicSourceCard({
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
}) {
  return (
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
}

export function MusicSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {eyebrow}
      </div>
      <h2 className="mt-1 font-display text-lg font-bold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}
