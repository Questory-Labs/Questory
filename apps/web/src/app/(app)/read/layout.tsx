"use client";

import { ReadGate } from "@/components/ReadGate";

export default function ReadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ReadGate>{children}</ReadGate>;
}
