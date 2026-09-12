"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive } from "./nav-config";

export const DomainSubnav = ({
  items,
}: {
  items: readonly { href: string; label: string }[];
}) => {
  const pathname = usePathname();
  const hrefs = items.map((i) => i.href);

  return (
    <nav className="mb-6" aria-label="Section">
      <ul className="flex flex-wrap gap-1 border-b border-[var(--line)]" role="tablist">
        {items.map((item) => {
          const active = isActive(pathname, item.href, hrefs);
          return (
            <li key={item.href} role="presentation">
              <Link
                href={item.href}
                role="tab"
                aria-selected={active}
                aria-current={active ? "page" : undefined}
                className={`inline-block px-3 py-2 text-sm transition ${
                  active
                    ? "nav-hatch text-[var(--ink)]"
                    : "text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
                data-active={active ? "true" : undefined}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
