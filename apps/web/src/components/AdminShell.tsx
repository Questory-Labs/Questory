"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { api } from "@/lib/api";

const BASE_NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/cron", label: "Cron" },
  { href: "/admin/migrations", label: "Migrations" },
  { href: "/admin/enrichment", label: "Enrichment" },
  { href: "/admin/scrapers", label: "Scrapers" },
  { href: "/admin/settings", label: "Settings" },
] as const;

type MeResponse = {
  user: {
    id: string;
    isAdmin?: boolean;
    personaName: string;
    email?: string | null;
  } | null;
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { enabled: enterpriseEnabled } = useEnterpriseEnabled();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
    retry: false,
  });

  const user = me.data?.user ?? null;
  const authReady = me.isSuccess || me.isError;

  const nav = [
    ...BASE_NAV.slice(0, 5),
    ...(enterpriseEnabled
      ? [{ href: "/admin/telemetry", label: "Telemetry" }]
      : []),
    BASE_NAV[5],
  ];

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
        Checking admin session…
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") router.replace("/login");
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
        Redirecting to sign in…
      </div>
    );
  }

  if (!user.isAdmin) {
    if (typeof window !== "undefined") router.replace("/dashboard");
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
        Admin access required…
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-0)_92%,transparent)] backdrop-blur-xl lg:flex">
        <div className="flex h-14 shrink-0 items-center px-4 shadow-[inset_0_-1px_0_0_var(--line)]">
          <span
            className="font-display text-lg tracking-tight"
            style={{ fontWeight: 700 }}
          >
            Admin
          </span>
        </div>
        <nav className="flex-1 space-y-0.5 px-2 py-4" aria-label="Admin">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-3 py-2 text-sm transition ${
                  active
                    ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
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
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--bg-0)_88%,transparent)] px-4 backdrop-blur-xl lg:hidden">
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
