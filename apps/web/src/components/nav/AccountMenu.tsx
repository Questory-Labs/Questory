"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { User } from "@questorylabs/shared";
import { useEffect, useRef, useState } from "react";
import { ACCOUNT_LINKS, isActive } from "./nav-config";

export const AccountMenu = ({
  user,
  onLogout,
  logoutPending,
  placement = "up",
}: {
  user: User;
  onLogout: () => void;
  logoutPending?: boolean;
  placement?: "up" | "down";
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const regionLabel = user.countryCode
    ? `${user.countryCode.toUpperCase()}${user.currency ? ` · ${user.currency}` : ""}`
    : "Region unset";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex w-full items-center gap-2.5 rounded-md px-1 py-1 text-left transition hover:bg-[var(--bg-2)]"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-8 w-8 border border-[var(--line)] object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center border border-[var(--line)] bg-[var(--bg-2)] text-xs text-[var(--muted)]">
            {user.personaName.slice(0, 1)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-[var(--ink)]">{user.personaName}</div>
          <div className="truncate font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
            {regionLabel}
          </div>
        </div>
        <span
          className={`shrink-0 text-[var(--faint)] transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute left-0 right-0 z-50 border border-[var(--line)] bg-[var(--bg-1)] ${
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="border-b border-[var(--line)] px-3 py-2">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
              Account
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {user.personaName}
            </div>
          </div>
          <ul className="py-1">
            {ACCOUNT_LINKS.map((item) => {
              const active = isActive(
                pathname,
                item.href,
                ACCOUNT_LINKS.map((l) => l.href),
              );
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    onClick={() => setOpen(false)}
                    className={`block px-3 py-2.5 transition ${
                      active
                        ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                        : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                    }`}
                  >
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {item.hint}
                    </div>
                  </Link>
                </li>
              );
            })}
            {user.isAdmin ? (
              <li>
                <Link
                  href="/admin"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2.5 text-[var(--ink)] transition hover:bg-[var(--bg-2)]"
                >
                  <div className="text-sm font-medium">Admin</div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    Instance overview & ops
                  </div>
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="border-t border-[var(--line)] p-1">
            <button
              type="button"
              role="menuitem"
              disabled={logoutPending}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--muted)] transition hover:bg-[var(--bg-2)] hover:text-[var(--ink)] disabled:opacity-50"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
