"use client";

import { AppShell } from "@/components/AppShell";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
