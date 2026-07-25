"use client";

import { RecommendationsPanel } from "@/components/enterprise/RecommendationsPanel";
import { PageHeader } from "@/components/ui";

/**
 * Recommendations UI ships with the community web app. Without the private
 * Rust enterprise service, EnterpriseGate redirects away.
 */
export default function RecommendationsPage() {
  return (
    <>
      <PageHeader
        title="Recommendations"
        description="What to play, watch, and listen to next — scored from your library, listening history, and watchlists."
      />
      <RecommendationsPanel />
    </>
  );
}
