import type { NavItem } from "@/components/nav/nav-config";

export type AdminNavGroup = { key: string; label: string; items: NavItem[] };

export const ADMIN_INSTANCE_NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard" },
  { href: "/admin/users", label: "Users", icon: "friends" },
  {
    href: "/admin/jobs",
    label: "Cron, scrapers, enrichment",
    icon: "sessions",
    also: ["/admin/cron", "/admin/scrapers", "/admin/enrichment"],
  },
  {
    href: "/admin/system",
    label: "Settings & migrations",
    icon: "settings",
    also: ["/admin/settings", "/admin/migrations"],
  },
];

export const ADMIN_QENGINE_NAV: NavItem[] = [
  { href: "/admin/telemetry", label: "Telemetry", icon: "charts" },
  { href: "/admin/guardrails", label: "Guardrails", icon: "admin" },
];

export const DEMO_ADMIN_HOME = "/admin/telemetry";

export const DEMO_ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  { key: "qengine", label: "QEngine", items: ADMIN_QENGINE_NAV },
];

export const isDemoAdminPath = (pathname: string): boolean =>
  ADMIN_QENGINE_NAV.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

export const buildAdminNavGroups = (enterprise: boolean): AdminNavGroup[] => [
  { key: "instance", label: "Instance", items: ADMIN_INSTANCE_NAV },
  ...(enterprise ? [{ key: "qengine", label: "QEngine", items: ADMIN_QENGINE_NAV }] : []),
];
