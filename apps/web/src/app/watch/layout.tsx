"use client";

import { AppShell } from "@/components/AppShell";

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
