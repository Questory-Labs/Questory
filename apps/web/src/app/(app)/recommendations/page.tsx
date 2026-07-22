"use client";

import { RecommendationsPanel } from "@enterprise/web";
import { PageHeader } from "@/components/ui";

/**
 * Thin community shell — all real UI lives in the private enterprise tree
 * (enterprise/packages/web-ui). Without it, @enterprise/web resolves to the
 * no-op stub and the EnterpriseGate layout redirects away anyway.
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
