import Link from "next/link";
import type { CSSProperties } from "react";
import type { RewindDomain, RewindScope } from "../media.rewind.types";

const TAB_WIDTH = 112;

const TABS: { scope: RewindScope; label: string; href: string; color: string }[] = [
  { scope: "all", label: "Everything", href: "/rewind", color: "var(--ink)" },
  { scope: "games", label: "Games", href: "/library/rewind", color: "var(--games)" },
  { scope: "music", label: "Music", href: "/music/rewind", color: "var(--music)" },
  { scope: "watch", label: "Watch", href: "/watch/rewind", color: "var(--watch)" },
  { scope: "read", label: "Read", href: "/read/rewind", color: "var(--read)" },
];

export const RewindDomainTabs = ({
  domain,
  enabled,
}: {
  domain: RewindScope;
  enabled: Partial<Record<RewindDomain, boolean>>;
}) => {
  const tabs = TABS.filter((t) => t.scope === "all" || t.scope === "games" || enabled[t.scope]);
  const active = Math.max(0, tabs.findIndex((t) => t.scope === domain));
  return (
    <nav
      aria-label="Rewind domain"
      className="relative inline-grid max-w-full overflow-x-auto rounded-full border border-[var(--line)] bg-white/[0.04] p-1"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, ${TAB_WIDTH}px)` } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="q-slide absolute bottom-1 left-1 top-1 rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{ width: TAB_WIDTH, transform: `translateX(${active * TAB_WIDTH}px)` }}
      />
      {tabs.map((t) => {
        const current = t.scope === domain;
        return (
          <Link
            key={t.scope}
            href={t.href}
            aria-current={current ? "page" : undefined}
            className={`relative inline-flex min-h-10 items-center justify-center gap-[7px] text-sm transition-colors duration-300 ${
              current ? "text-white" : "text-muted hover:text-ink"
            }`}
          >
            <span
              aria-hidden="true"
              className="size-[5px] rounded-full"
              style={{ background: t.color }}
            />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
};
