"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingPage } from "@/components/LoadingPage";
import { NavIcon } from "@/components/nav/NavIcon";
import { isActive } from "@/components/nav/nav-config";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { useUser } from "@/hooks/useUser";
import type { NavIconName } from "@/components/nav/nav-config";

const BASE_NAV: { href: string; label: string; icon: NavIconName }[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "friends" },
  { href: "/admin/cron", label: "Cron", icon: "sessions" },
  { href: "/admin/migrations", label: "Migrations", icon: "collections" },
  { href: "/admin/enrichment", label: "Enrichment", icon: "library" },
  { href: "/admin/scrapers", label: "Scrapers", icon: "trending" },
  { href: "/admin/settings", label: "Settings", icon: "cost" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { when: enterpriseEnabled, isLoading: enterpriseLoading } =
    useEnterpriseEnabled();
  const { user, authReady } = useUser();

  const showEnterpriseNav = enterpriseEnabled && !enterpriseLoading;

  const nav = [
    ...BASE_NAV.slice(0, 5),
    ...(showEnterpriseNav
      ? [
          { href: "/admin/telemetry", label: "Telemetry", icon: "recs" as const },
          { href: "/admin/guardrails", label: "Guardrails", icon: "family" as const },
        ]
      : []),
    BASE_NAV[5],
    BASE_NAV[6],
  ];
  const hrefs = nav.map((i) => i.href);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      router.replace("/login");
    } else if (!user.isAdmin) {
      router.replace("/dashboard");
    }
  }, [authReady, user, router]);

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
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
        Admin access required…
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[var(--bg-0)] lg:flex">
        <div className="flex h-14 shrink-0 items-center px-4 shadow-[inset_0_-1px_0_0_var(--line)]">
          <span className="font-display text-lg font-bold tracking-tight">Admin</span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-4" aria-label="Admin">
          {nav.map((item) => {
            const active = isActive(pathname, item.href, hrefs);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
                }`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="chrome-hatch-rule" aria-hidden />
        <div className="border-t border-[var(--line)] p-3 text-xs text-[var(--muted)]">
          <div className="truncate">{user.email || user.personaName}</div>
          <Link
            href="/dashboard"
            className="mt-2 inline-block text-[var(--accent)] hover:underline"
          >
            Back to app
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[var(--bg-0)] px-4 lg:hidden">
          <span className="font-display font-bold">Admin</span>
          <nav className="ml-auto flex gap-2 overflow-x-auto text-xs">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 text-[var(--muted)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
