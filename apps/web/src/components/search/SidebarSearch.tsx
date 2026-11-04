"use client";

import { useGlobalSearch } from "./GlobalSearchProvider";

export function SidebarSearch() {
  const { setOpen } = useGlobalSearch();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.03] px-3 text-left text-sm text-[var(--faint)] transition hover:border-[var(--line-strong)] hover:text-[var(--muted)]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 16l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="flex-1 truncate">Search</span>
      <kbd className="font-mono text-[10px] tracking-wide" aria-hidden>
        Ctrl K
      </kbd>
    </button>
  );
}
