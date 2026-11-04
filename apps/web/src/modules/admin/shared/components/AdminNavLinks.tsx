"use client";

import Link from "next/link";
import { NavIcon } from "@/components/nav/NavIcon";
import { activeNavHref, type NavItem } from "@/components/nav/nav-config";
import type { AdminNavGroup } from "../admin.nav";

const ITEM =
  "q-row flex min-h-9 items-center gap-2.5 rounded-[14px] px-3 text-sm transition";
const ITEM_ACTIVE =
  "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]";
const ITEM_IDLE = "text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--ink)]";

export const AdminNavLinks = ({
  pathname,
  groups,
  onNavigate,
}: {
  pathname: string;
  groups: AdminNavGroup[];
  onNavigate?: () => void;
}) => {
  const activeHref = activeNavHref(
    pathname,
    groups.flatMap((g) => g.items),
  );

  const renderItem = (item: NavItem) => {
    const active = item.href === activeHref;
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={`${ITEM} ${active ? ITEM_ACTIVE : ITEM_IDLE}`}
        >
          <NavIcon name={item.icon} />
          <span className="flex-1 truncate">{item.label}</span>
          {active ? (
            <span
              className="dot text-[var(--warm)] shadow-[0_0_8px_var(--warm)]"
              aria-hidden
              data-testid="admin-nav-dot"
            />
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-4 py-3">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className="label-mono px-3 pb-1.5">{group.label}</h2>
          <ul className="space-y-0.5">{group.items.map(renderItem)}</ul>
        </section>
      ))}
      <ul className="space-y-0.5 border-t border-[var(--line)] pt-3">
        <li>
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={`${ITEM} ${ITEM_IDLE}`}
          >
            <BackIcon />
            <span className="flex-1 truncate">Back to app</span>
          </Link>
        </li>
      </ul>
    </div>
  );
};

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
