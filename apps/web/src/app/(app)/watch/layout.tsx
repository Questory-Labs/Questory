"use client";

import { WatchGate } from "@/components/WatchGate";

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WatchGate>{children}</WatchGate>;
}
