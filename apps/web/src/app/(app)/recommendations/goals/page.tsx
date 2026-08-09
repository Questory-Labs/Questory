"use client";

import { SmartGoalsPanel } from "@/components/enterprise/SmartGoalsPanel";
import { PageHeader } from "@/components/ui";

export default function SmartGoalsPage() {
  return (
    <>
      <PageHeader
        title="Smart Goals"
        description="Crush your backlog. AI analyzes your library to suggest the shortest games, movies, and books to help you reach your goals."
      />
      <SmartGoalsPanel />
    </>
  );
}
