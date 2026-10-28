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
        className="flex w-full items-center gap-2.5 rounded-full p-1 pr-2.5 text-left transition-colors hover:bg-white/[0.05] aria-expanded:bg-white/[0.05]"
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full border border-[var(--line)] object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] bg-white/[0.06] text-xs text-[var(--muted)]">
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
          className={`panel q-pop absolute left-0 right-0 z-50 overflow-hidden rounded-[18px] p-1.5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur-[18px] ${
            placement === "up" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          <div className="px-3 pt-2 pb-2.5">
            <div className="label-mono text-[var(--faint)]">
              Account
            </div>
            <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
              {user.personaName}
            </div>
          </div>
          <ul className="flex flex-col gap-0.5 border-t border-[var(--line)] p-0 pt-1.5">
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
                    className={`block rounded-xl px-3 py-2.5 transition-colors ${
                      active
                        ? "bg-white/[0.08] text-[var(--ink)]"
                        : "text-[var(--ink)] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="text-sm">{item.label}</div>
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
                  className="block rounded-xl px-3 py-2.5 text-[var(--ink)] transition-colors hover:bg-white/[0.05]"
                >
                  <div className="text-sm">Admin</div>
                  <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                    Instance overview & ops
                  </div>
                </Link>
              </li>
            ) : null}
          </ul>
          <div className="mt-1.5 border-t border-[var(--line)] pt-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={logoutPending}
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--muted)] transition-colors hover:bg-white/[0.05] hover:text-[var(--ink)] disabled:opacity-50"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
