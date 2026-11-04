import Link from "next/link";
import { cn } from "@questorylabs/ui";

const TABS = [
  { key: "library", label: "Library", href: "/read/library" },
  { key: "history", label: "History", href: "/read/history" },
] as const;

export const ReadShelfTabs = ({ active }: { active: "library" | "history" }) => {
  const index = TABS.findIndex((t) => t.key === active);
  return (
    <nav
      aria-label="View"
      className="relative grid grid-cols-[repeat(2,96px)] rounded-full border border-white/[0.07] bg-white/[0.04] p-1"
    >
      <span
        aria-hidden="true"
        className="q-slide absolute inset-y-1 left-1 w-24 rounded-full bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
        style={{ transform: `translateX(${index * 96}px)` }}
      />
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "relative flex min-h-[38px] items-center justify-center text-sm no-underline",
            t.key === active ? "text-white" : "text-[var(--muted)] hover:text-[var(--ink)]",
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
};
