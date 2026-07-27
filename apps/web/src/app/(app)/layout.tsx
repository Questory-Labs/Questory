"use client";

import { AppShell } from "@/components/AppShell";

/** Shared shell for all authenticated app routes — stays mounted across navigations. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
