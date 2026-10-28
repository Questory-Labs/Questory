"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { LoadingPage } from "@/components/LoadingPage";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useUser } from "@/hooks/useUser";
import { buildAdminNavGroups } from "@/modules/admin/shared/admin.nav";
import { AdminNavLinks } from "@/modules/admin/shared/components/AdminNavLinks";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const menuId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const { when: enterpriseEnabled, isLoading: enterpriseLoading } =
    useEnterpriseEnabled();
  const { user, authReady } = useUser();

  const showEnterpriseNav = Boolean(enterpriseEnabled) && !enterpriseLoading;
  const groups = useMemo(
    () => buildAdminNavGroups(showEnterpriseNav),
    [showEnterpriseNav],
  );

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.isAdmin) {
      router.replace("/dashboard");
    }
  }, [authReady, user, router]);

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

  if (!authReady) {
    return (
      <LoadingPage
        title="Checking admin session"
        logLine="quest log › auth_me — status: in_progress · clearance: admin"
      />
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
        Redirecting to sign in…
      </div>
    );
  }

  if (!user.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] px-4">
        <div className="panel q-in w-full max-w-sm p-6 text-center">
          <p className="label-mono flex items-center justify-center gap-2">
            <span className="dot text-[var(--warm)] shadow-[0_0_8px_var(--warm)]" aria-hidden />
            Admin
          </p>
          <h1 className="font-display mt-3 text-2xl font-light">
            Access <span className="font-serif">required</span>
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Admin access required. Taking you back to the app…
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm text-[var(--warm)] hover:underline"
          >
            Back to app
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-screen p-3 pr-0 lg:block">
        <div className="panel flex h-full flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 px-4 pb-2 pt-4">
            <BrandMark href="/admin" size="sm" wordmarkClassName="text-[1.35rem]" />
            <span className="label-mono ml-auto text-[var(--warm)]">Admin</span>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2" aria-label="Admin">
            <AdminNavLinks pathname={pathname} groups={groups} />
          </nav>
          <div className="truncate border-t border-[var(--line)] px-4 py-3 font-mono text-[10px] text-[var(--faint)]">
            {user.email || user.personaName}
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 bg-[var(--bg-0)]/80 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 shrink-0 items-center gap-3 px-4 shadow-[inset_0_-1px_0_0_var(--line)] sm:px-6">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] transition hover:border-[var(--line-strong)]"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
            <BrandMark href="/admin" size="sm" className="shrink-0" wordmarkClassName="text-lg" />
            <span className="label-mono ml-auto text-[var(--warm)]">Admin</span>
          </div>
        </header>

        {menuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              id={menuId}
              className="q-in absolute bottom-2 left-2 top-2 flex w-[min(18rem,86vw)] flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line-strong)] bg-[var(--bg-1)]"
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
                <BrandMark href={null} size="sm" wordmarkClassName="text-lg" />
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)]"
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="sr-only">Close</span>
                  <CloseIcon />
                </button>
              </div>
              <nav className="min-h-0 flex-1 overflow-y-auto px-2" aria-label="Admin mobile">
                <AdminNavLinks
                  pathname={pathname}
                  groups={groups}
                  onNavigate={() => setMenuOpen(false)}
                />
              </nav>
            </div>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-10">{children}</main>
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
