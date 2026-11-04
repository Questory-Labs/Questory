"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { NavIcon } from "./NavIcon";
import {
  activeNavHref,
  activeSectionKey,
  type NavGroup,
  type NavItem,
  type NavSectionKey,
  formatNavCount,
} from "./nav-config";

const SECTION_DOT: Record<NavSectionKey, string> = {
  everywhere: "text-[var(--ink)]",
  games: "text-[var(--games)]",
  music: "text-[var(--music)]",
  watch: "text-[var(--watch)]",
  read: "text-[var(--read)]",
};

const SECTION_GLOW: Record<NavSectionKey, string> = {
  everywhere: "shadow-[0_0_8px_var(--ink)]",
  games: "shadow-[0_0_8px_var(--games)]",
  music: "shadow-[0_0_8px_var(--music)]",
  watch: "shadow-[0_0_8px_var(--watch)]",
  read: "shadow-[0_0_8px_var(--read)]",
};

export const NavLinks = ({
  pathname,
  onNavigate,
  groups,
  footer = [],
  counts = {},
}: {
  pathname: string;
  onNavigate?: () => void;
  groups: NavGroup[];
  footer?: NavItem[];
  counts?: Partial<Record<NavSectionKey, number>>;
}) => {
  const baseId = useId();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const activeHref = activeNavHref(pathname, [...groups.flatMap((g) => g.items), ...footer]);
  const activeKey = activeSectionKey(pathname, groups);
  const [open, setOpen] = useState<Set<NavSectionKey>>(
    () => new Set(activeKey ? [activeKey] : ["games"]),
  );

  useEffect(() => {
    if (!activeKey) return;
    setOpen((prev) => (prev.has(activeKey) ? prev : new Set(prev).add(activeKey)));
  }, [activeKey]);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname, groups]);

  const toggle = (key: NavSectionKey) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const accentKey = activeKey ?? "everywhere";

  const renderItem = (item: NavItem, hidden = false) => {
    const active = item.href === activeHref;
    return (
      <li key={item.href}>
        <Link
          ref={active ? activeRef : undefined}
          href={item.href}
          onClick={onNavigate}
          tabIndex={hidden ? -1 : undefined}
          aria-current={active ? "page" : undefined}
          className={`q-row flex min-h-9 scroll-mt-8 items-center gap-2.5 rounded-[14px] px-3 text-sm transition ${
            active
              ? "bg-white/[0.08] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              : "text-[var(--muted)] hover:bg-white/[0.04] hover:text-[var(--ink)]"
          }`}
        >
          <NavIcon name={item.icon} />
          <span className="flex-1 truncate">{item.label}</span>
          {active ? (
            <span
              className={`dot ${SECTION_DOT[accentKey]} ${SECTION_GLOW[accentKey]}`}
              aria-hidden
            />
          ) : null}
        </Link>
      </li>
    );
  };

  return (
    <div className="space-y-4 py-3">
      {groups.map((group) => {
        if (!group.collapsible) {
          return (
            <section key={group.key}>
              <h2 className="label-mono px-3 pb-1.5">{group.label}</h2>
              <ul className="space-y-0.5">{group.items.map((item) => renderItem(item))}</ul>
            </section>
          );
        }
        const expanded = open.has(group.key);
        const panelId = `${baseId}-${group.key}`;
        return (
          <section key={group.key}>
            <h2>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggle(group.key)}
                className={`flex w-full items-center gap-2.5 rounded-[12px] px-3 py-1.5 text-left text-[13px] transition hover:text-[var(--ink)] ${
                  expanded ? "text-[#cfcfd3]" : "text-[var(--faint)]"
                }`}
              >
                <span
                  className={`dot ${SECTION_DOT[group.key]} ${expanded ? SECTION_GLOW[group.key] : ""}`}
                  aria-hidden
                />
                <span className="flex-1">{group.label}</span>
                {counts[group.key] != null ? (
                  <span className="text-xs tabular-nums text-[var(--faint)]">
                    {formatNavCount(counts[group.key] ?? 0)}
                  </span>
                ) : null}
                <svg
                  viewBox="0 0 16 16"
                  className={`h-3 w-3 transition-transform duration-300 ${expanded ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path d="M6 4l4 4-4 4" />
                </svg>
              </button>
            </h2>
            <div
              id={panelId}
              className={`grid transition-[grid-template-rows] duration-300 ease-[var(--ease-out)] ${
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
              inert={!expanded}
            >
              <ul className="min-h-0 space-y-0.5 overflow-hidden pt-1">
                {group.items.map((item) => renderItem(item, !expanded))}
              </ul>
            </div>
          </section>
        );
      })}
      {footer.length > 0 ? (
        <ul className="space-y-0.5 border-t border-[var(--line)] pt-3">
          {footer.map((item) => renderItem(item))}
        </ul>
      ) : null}
    </div>
  );
};
