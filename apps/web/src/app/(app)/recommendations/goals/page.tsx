"use client";

import { SmartGoalsPanel } from "@/modules/enterprise/recommendations/components/SmartGoalsPanel";
import { PageHeader } from "@/components/ui";

export default function SmartGoalsPage() {
  return (
    <>
      <PageHeader size="sm"
        title="Smart Goals"
        description="Unfinished games, watchlist titles, and in-progress reads — sized to the timeframe you pick."
      />
      <SmartGoalsPanel />
    </>
  );
}
