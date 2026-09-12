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
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.label}>
          <div className="font-mono mb-1.5 px-2.5 text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            {group.label}
          </div>
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
                    className={`flex items-center gap-2.5 px-2.5 py-2 text-sm transition ${
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
        </div>
      ))}
    </div>
  );
};
