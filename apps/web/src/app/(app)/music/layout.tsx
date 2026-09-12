"use client";

import { MusicGate } from "@/components/MusicGate";

export default function MusicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MusicGate>{children}</MusicGate>;
}
