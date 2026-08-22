"use client";

import Link from "next/link";
import { sanitizeAppHref } from "@questorylabs/shared";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationBell() {
  const {
    unreadCount,
    items,
    listOpen,
    setListOpen,
    markAllRead,
  } = useNotifications();

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setListOpen(!listOpen)}
        className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
        aria-label="Notifications"
        aria-expanded={listOpen}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-[var(--accent)] px-1 font-mono text-[10px] text-[var(--bg-0)]">
            {unreadCount}
          </span>
        )}
      </button>
      {listOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-[var(--line)] bg-[var(--bg-1)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
            <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
              Alerts
            </span>
            <button
              type="button"
              className="text-[11px] text-[var(--accent)]"
              onClick={() => markAllRead()}
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-4 text-sm text-[var(--muted)]">
                No deal alerts yet. Set wishlist targets to get notified.
              </li>
            )}
            {items.map((n) => (
              <li
                key={n.id}
                className={`border-t border-[var(--line)] px-3 py-2.5 text-sm ${
                  n.readAt ? "opacity-60" : ""
                }`}
              >
                {sanitizeAppHref(n.href) ? (
                  <Link
                    href={sanitizeAppHref(n.href)!}
                    onClick={() => setListOpen(false)}
                    className="block hover:text-[var(--accent)]"
                  >
                    <div className="font-medium">{n.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      {n.body}
                    </div>
                  </Link>
                ) : (
                  <>
                    <div className="font-medium">{n.title}</div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      {n.body}
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9a6 6 0 1 1 12 0c0 3.5 1.5 5 2 6H4c.5-1 2-2.5 2-6Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M10 19a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
