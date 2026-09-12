"use client";

import { WatchGate } from "@/components/WatchGate";
import { DomainSubnav } from "@/components/nav/DomainSubnav";
import { WATCH_SUBNAV } from "@/components/nav/nav-config";

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WatchGate>
      <DomainSubnav items={WATCH_SUBNAV} />
      {children}
    </WatchGate>
  );
}
