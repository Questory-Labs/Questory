"use client";

import { EnterpriseGate } from "@/components/EnterpriseGate";

export default function RecommendationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EnterpriseGate>{children}</EnterpriseGate>;
}
