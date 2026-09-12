"use client";

import { MusicGate } from "@/components/MusicGate";
import { DomainSubnav } from "@/components/nav/DomainSubnav";
import { MUSIC_SUBNAV } from "@/components/nav/nav-config";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MusicGate>
      <DomainSubnav items={MUSIC_SUBNAV} />
      {children}
    </MusicGate>
  );
}
