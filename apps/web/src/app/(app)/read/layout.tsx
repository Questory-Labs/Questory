"use client";

import { ReadGate } from "@/components/ReadGate";
import { DomainSubnav } from "@/components/nav/DomainSubnav";
import { READ_SUBNAV } from "@/components/nav/nav-config";

export default function ReadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ReadGate>
      <DomainSubnav items={READ_SUBNAV} />
      {children}
    </ReadGate>
  );
}
