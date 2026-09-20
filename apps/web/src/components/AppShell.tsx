"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAction, useStore } from "@questorylabs/qhttp/react";
import { BrandMark } from "@/components/BrandMark";
import { LoadingPage } from "@/components/LoadingPage";
import { NotificationBell } from "@/components/NotificationBell";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { GlobalSearchDialog } from "@/components/search/GlobalSearchDialog";
import { GlobalSearchProvider } from "@/components/search/GlobalSearchProvider";
import { HeaderSearch } from "@/components/search/HeaderSearch";
import { useGlobalSearchShortcut } from "@/components/search/useGlobalSearchShortcut";
import { AccountMenu } from "@/components/nav/AccountMenu";
import { NavLinks } from "@/components/nav/NavLinks";
import { buildNavGroups } from "@/components/nav/nav-config";
import { api } from "@/lib/api";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useUser } from "@/hooks/useUser";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { useDropEpochBump } from "@/providers/StatusProvider";
import { useEffect, useId, useMemo, useState } from "react";

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
  const store = useStore();
  const bumpStatus = useDropEpochBump();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  useGlobalSearchShortcut();
  const { showMusicNav } = useMusicEnabled();
  const { enabled: showWatchNav } = useWatchEnabled();
  const { showReadNav } = useReadEnabled();
  const { enabled: showEnterpriseNav } = useEnterpriseEnabled();
  const { user, authReady, isAuthenticated, failed } = useUser();

  const navGroups = useMemo(
    () =>
      buildNavGroups({
        music: showMusicNav,
        watch: showWatchNav,
        read: showReadNav,
        enterprise: showEnterpriseNav,
      }),
    [showEnterpriseNav, showMusicNav, showWatchNav, showReadNav],
  );

  const logout = useAction({
    run: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      store.drop();
      bumpStatus();
      router.push("/");
    },
  });

  useEffect(() => {
    if (!authReady) return;
    if (!isAuthenticated) router.replace("/login");
  }, [authReady, isAuthenticated, router]);

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

  if (!authReady || !user) {
    if (failed) {
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
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[var(--bg-0)] lg:flex">
        <div className="flex h-14 shrink-0 items-center px-4 shadow-[inset_0_-1px_0_0_var(--line)]">
          <BrandMark
            href="/dashboard"
            size="sm"
            wordmarkClassName="text-[1.35rem]"
          />
        </div>

        <nav
          className="min-h-0 flex-1 overflow-y-auto px-2 [--nav-sticky-bg:var(--bg-0)]"
          aria-label="Primary"
        >
          <NavLinks pathname={pathname} groups={navGroups} />
        </nav>

        <div className="chrome-hatch-rule" aria-hidden />

        <div className="border-t border-[var(--line)] p-3">
          <AccountMenu
            user={user}
            onLogout={() => logout.submit()}
            logoutPending={logout.busy}
            placement="up"
          />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 bg-[var(--bg-0)]">
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

            <HeaderSearch />

            <NotificationBell />
          </div>
          <div className="chrome-hatch-rule lg:hidden" aria-hidden />
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-[var(--bg-0)]/70 hatch-fill"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id={menuId}
              className="absolute left-0 top-0 flex h-full w-[min(18rem,86vw)] flex-col border-r border-[var(--line)] bg-[var(--bg-1)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                <BrandMark href={null} size="sm" wordmarkClassName="text-lg" />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center border border-[var(--line)]"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <CloseIcon />
                </button>
              </div>

              <nav
                className="min-h-0 flex-1 overflow-y-auto px-2 [--nav-sticky-bg:var(--bg-1)]"
                aria-label="Mobile"
              >
                <NavLinks
                  pathname={pathname}
                  groups={navGroups}
                  onNavigate={() => setMenuOpen(false)}
                />
              </nav>

              <div className="border-t border-[var(--line)] p-3">
                <AccountMenu
                  user={user}
                  onLogout={() => logout.submit()}
                  logoutPending={logout.busy}
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
