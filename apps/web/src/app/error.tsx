"use client";

import { StatusPage } from "@/components/StatusPage";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest ? ` · digest: ${error.digest}` : "";

  return (
    <StatusPage
      code="500"
      eyebrow="Sync interrupted"
      title="The quest log glitched"
      description="Something went sideways behind the curtain. Your library data should be fine — this is our bug, not yours. Give it another try?"
      logLine={`quest log › unhandled_exception — status: 500${digest}`}
      tone="warm"
      primary={{ label: "Try again", onClick: reset, variant: "primary" }}
      secondary={{ label: "Back to dashboard", href: "/dashboard" }}
    />
  );
}
