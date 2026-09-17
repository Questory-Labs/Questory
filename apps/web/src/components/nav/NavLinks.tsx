"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { NavIcon } from "./NavIcon";
import { isActive, type NavGroup } from "./nav-config";

export const NavLinks = ({
  pathname,
  onNavigate,
  groups,
}: {
  pathname: string;
  onNavigate?: () => void;
  groups: NavGroup[];
}) => {
  const allHrefs = groups.flatMap((g) => g.items.map((i) => i.href));
  const activeRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname, groups]);

  return (
    <div className="space-y-5 py-4">
      {groups.map((group) => (
        <section key={group.label}>
          <h2 className="sticky top-0 z-10 bg-[var(--nav-sticky-bg,var(--bg-0))] px-2.5 pb-1.5 pt-1 font-mono text-[10px] font-normal uppercase tracking-[0.18em] text-[var(--faint)]">
            {group.label}
          </h2>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href, allHrefs);
              return (
                <li key={item.href}>
                  <Link
                    ref={active ? activeRef : undefined}
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex scroll-mt-8 items-center gap-2.5 px-2.5 py-2 text-sm transition ${
                      active
                        ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                        : "text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
};
