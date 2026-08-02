"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { sanitizeAppHref } from "@questorylabs/shared";
import { BrandMark } from "@/components/BrandMark";
import { LoadingPage } from "@/components/LoadingPage";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import {
  GlobalSearchProvider,
  useGlobalSearch,
} from "@/components/search/GlobalSearchProvider";
import { useGlobalSearchShortcut } from "@/components/search/useGlobalSearchShortcut";
import { api } from "@/lib/api";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const ACCOUNT_LINKS = [
  { href: "/settings/profile", label: "Profile", hint: "Account & price region" },
  {
    href: "/settings/connections",
    label: "Connections",
    hint: "Steam, stores, music, watch",
  },
] as const;

const BASE_NAV_GROUPS: { label: string; items: { href: string; label: string }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/trending", label: "Trending" },
    ],
  },
  {
    label: "Your games",
    items: [
      { href: "/library", label: "Library" },
      { href: "/wishlist", label: "Wishlist" },
      { href: "/collections", label: "Collections" },
      { href: "/cost", label: "Cost" },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/friends", label: "Friends" },
      { href: "/multiplayer", label: "Multiplayer" },
      { href: "/family", label: "Family" },
    ],
  },
];

const ENTERPRISE_NAV_GROUP = {
  label: "For you",
  items: [{ href: "/recommendations", label: "Recommendations" }],
};

const MUSIC_NAV_GROUP = {
  label: "Music",
  items: [
    { href: "/music", label: "Music" },
    { href: "/music/listening", label: "Listening" },
    { href: "/music/charts", label: "Top charts" },
    { href: "/music/rewind", label: "Rewind" },
    { href: "/music/settings", label: "Sources" },
  ],
};

const WATCH_NAV_GROUP = {
  label: "Watch",
  items: [
    { href: "/watch", label: "Watch" },
    { href: "/watch/history", label: "History" },
    { href: "/watch/rewind", label: "Rewind" },
    { href: "/watch/settings", label: "Sources" },
  ],
};

const READ_NAV_GROUP = {
  label: "Read",
  items: [
    { href: "/read", label: "Read" },
    { href: "/read/library", label: "Library" },
    { href: "/read/history", label: "History" },
    { href: "/read/rewind", label: "Rewind" },
    { href: "/read/settings", label: "Sources" },
  ],
};

type MeResponse = {
  user: {
    id: string;
    steamId: string | null;
    email?: string | null;
    isAdmin?: boolean;
    personaName: string;
    avatarUrl: string | null;
    countryCode?: string | null;
    currency?: string;
  } | null;
};

function AccountMenu({
  user,
  onLogout,
  logoutPending,
  placement = "up",
}: {
  user: NonNullable<MeResponse["user"]>;
  onLogout: () => void;
  logoutPending?: boolean;
  placement?: "up" | "down";
}) {
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
          <div className="truncate text-sm text-[var(--ink)]">
            {user.personaName}
          </div>
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
          className={`absolute left-0 right-0 z-50 border border-[var(--line)] bg-[var(--bg-1)] shadow-xl ${
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
}

function pathMatches(pathname: string, href: string) {
  const pathOnly = href.split("?")[0];
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

/** Prefer the longest matching nav href so /music doesn't stay active on /music/listening. */
function isActive(pathname: string, href: string, candidates: string[]) {
  const pathOnly = href.split("?")[0];
  if (!pathMatches(pathname, pathOnly)) return false;
  const best = candidates
    .map((h) => h.split("?")[0])
    .filter((h) => pathMatches(pathname, h))
    .reduce((a, b) => (b.length > a.length ? b : a));
  return best === pathOnly;
}

function NavLinks({
  pathname,
  onNavigate,
  groups,
}: {
  pathname: string;
  onNavigate?: () => void;
  groups: { label: string; items: { href: string; label: string }[] }[];
}) {
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
                    <span
                      className={`h-4 w-[3px] shrink-0 ${
                        active ? "hatch-fill-dense bg-[var(--accent)]" : "bg-transparent"
                      }`}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <GlobalSearchProvider>
      <AppShellInner>{children}</AppShellInner>
      <GlobalSearchDialog />
    </GlobalSearchProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();
  const menuId = useId();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const { setOpen: setSearchOpen } = useGlobalSearch();
  useGlobalSearchShortcut();
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();
  const { enabled: showEnterpriseNav } = useEnterpriseEnabled();

  const navGroups = useMemo(() => {
    const groups = [...BASE_NAV_GROUPS];
    if (showEnterpriseNav) groups.splice(1, 0, ENTERPRISE_NAV_GROUP);
    if (showMusicNav) groups.push(MUSIC_NAV_GROUP);
    if (showWatchNav) groups.push(WATCH_NAV_GROUP);
    if (showReadNav) groups.push(READ_NAV_GROUP);
    return groups;
  }, [showEnterpriseNav, showMusicNav, showWatchNav, showReadNav]);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
    retry: false,
  });

  const user = me.data?.user ?? null;
  const authReady = me.isSuccess || me.isError;
  const isAuthed = Boolean(user);

  const [notifOpen, setNotifOpen] = useState(false);
  const unread = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => api<{ count: number }>("/notifications/unread-count"),
    enabled: isAuthed,
    refetchInterval: 30_000,
  });
  const notifications = useQuery({
    queryKey: ["notifications"],
    queryFn: () =>
      api<
        {
          id: string;
          title: string;
          body: string;
          href: string | null;
          readAt: string | null;
          createdAt: string;
        }[]
      >("/notifications"),
    enabled: isAuthed && notifOpen,
  });
  const markRead = useMutation({
    mutationFn: () => api("/notifications/read", { method: "POST" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread"] });
    },
  });

  const logout = useMutation({
    mutationFn: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      qc.clear();
      router.push("/");
    },
  });

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthed) router.replace("/login");
  }, [authReady, isAuthed, router]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search.trim())}`);
      setMenuOpen(false);
    }
  };

  // Soft gate: never paint app pages until /auth/me confirms a session.
  if (!authReady || !user) {
    if (me.isError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
          Redirecting to sign in…
        </div>
      );
    }
    return (
      <LoadingPage
        title="Checking session"
        logLine="quest log › auth_me — status: in_progress"
      />
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15.5rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-0)_92%,transparent)] backdrop-blur-xl lg:flex">
        <div className="flex h-14 shrink-0 items-center px-4 shadow-[inset_0_-1px_0_0_var(--line)]">
          <BrandMark
            href="/dashboard"
            size="sm"
            wordmarkClassName="text-[1.35rem]"
          />
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Primary">
          <NavLinks pathname={pathname} groups={navGroups} />
        </nav>

        <div
          className="h-[3px] opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--hatch-strong), var(--hatch-strong) 3px, transparent 3px, transparent 7px)",
          }}
          aria-hidden
        />

        <div className="border-t border-[var(--line)] p-3">
          <AccountMenu
            user={user}
            onLogout={() => logout.mutate()}
            logoutPending={logout.isPending}
            placement="up"
          />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 bg-[color-mix(in_srgb,var(--bg-0)_88%,transparent)] backdrop-blur-xl">
          <div className="flex h-14 shrink-0 items-center gap-3 px-4 shadow-[inset_0_-1px_0_0_var(--line)] sm:px-6">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] text-[var(--ink)] transition hover:border-[var(--line-strong)] lg:hidden"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <BrandMark
              href="/dashboard"
              size="sm"
              className="shrink-0 lg:hidden"
              wordmarkClassName="text-lg"
            />

            <form className="ml-auto min-w-0 max-w-xl flex-1 sm:ml-0" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="shell-search">
                Search library
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--faint)]"
                  aria-hidden
                >
                  <SearchIcon />
                </span>
                <input
                  id="shell-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search games, movie:godfather, within:<7d'
                  className="w-full border border-[var(--line)] bg-[var(--bg-1)] py-2 pl-9 pr-20 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--faint)] focus:border-[var(--line-strong)] focus:bg-[var(--bg-2)]"
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 items-center gap-1 border border-[var(--line)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--faint)] transition hover:border-[var(--line-strong)] hover:text-[var(--muted)] sm:inline-flex"
                  aria-label="Open command palette"
                >
                  <span>Ctrl</span>
                  <span>K</span>
                </button>
              </div>
            </form>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--line-strong)] hover:text-[var(--ink)]"
                aria-label="Notifications"
              >
                <BellIcon />
                {(unread.data?.count || 0) > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-[var(--accent)] px-1 font-mono text-[10px] text-[var(--bg-0)]">
                    {unread.data?.count}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] border border-[var(--line)] bg-[var(--bg-1)] shadow-xl">
                  <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2">
                    <span className="text-xs uppercase tracking-wider text-[var(--muted)]">
                      Alerts
                    </span>
                    <button
                      type="button"
                      className="text-[11px] text-[var(--accent)]"
                      onClick={() => markRead.mutate()}
                    >
                      Mark all read
                    </button>
                  </div>
                  <ul className="max-h-72 overflow-y-auto">
                    {(notifications.data || []).length === 0 && (
                      <li className="px-3 py-4 text-sm text-[var(--muted)]">
                        No deal alerts yet. Set wishlist targets to get notified.
                      </li>
                    )}
                    {(notifications.data || []).map((n) => (
                      <li
                        key={n.id}
                        className={`border-t border-[var(--line)] px-3 py-2.5 text-sm ${
                          n.readAt ? "opacity-60" : ""
                        }`}
                      >
                        {sanitizeAppHref(n.href) ? (
                          <Link
                            href={sanitizeAppHref(n.href)!}
                            onClick={() => setNotifOpen(false)}
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

            {user.avatarUrl ? (
              <div className="hidden items-center gap-2 border-l border-[var(--line)] pl-3 lg:hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-8 w-8 border border-[var(--line)] object-cover"
                />
              </div>
            ) : null}
          </div>
          <div
            className="h-[3px] opacity-70 lg:hidden"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, var(--hatch-strong), var(--hatch-strong) 4px, transparent 4px, transparent 8px)",
            }}
            aria-hidden
          />
        </header>

        {/* Mobile drawer — same grouped nav */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id={menuId}
              className="absolute left-0 top-0 flex h-full w-[min(18rem,86vw)] flex-col border-r border-[var(--line)] bg-[var(--bg-1)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                <BrandMark
                  href={null}
                  size="sm"
                  wordmarkClassName="text-lg"
                />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)]"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <CloseIcon />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-2 py-4" aria-label="Mobile">
                <NavLinks
                  pathname={pathname}
                  groups={navGroups}
                  onNavigate={() => setMenuOpen(false)}
                />
              </nav>

              <div className="border-t border-[var(--line)] p-3">
                <AccountMenu
                  user={user}
                  onLogout={() => logout.mutate()}
                  logoutPending={logout.isPending}
                  placement="up"
                />
              </div>
            </div>
          </div>
        )}

        {!pathname.startsWith("/settings/connections") ? (
          <SyncStatusBar
            steamEnabled={Boolean(user.steamId)}
            musicEnabled={showMusicNav}
            watchEnabled={showWatchNav}
            readEnabled={showReadNav}
          />
        ) : null}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 16l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
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

function MenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
