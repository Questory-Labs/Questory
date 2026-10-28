"use client";

import { StatusPage } from "@/components/StatusPage";
import { errorRequestId } from "@/lib/api";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const digest = error.digest ? ` · digest: ${error.digest}` : "";
  const reference = errorRequestId(error) ?? error.digest;

  return (
    <StatusPage
      code="500"
      eyebrow="Server error"
      title="Something broke"
      titleAccent="on our side"
      taglineContext="serverError"
      logLine={`quest log › unhandled_exception — status: 500${digest}`}
      reference={reference}
      tone="danger"
      primary={{ label: "Try again", onClick: reset, variant: "primary" }}
      secondary={{ label: "Back to dashboard", href: "/dashboard" }}
    />
  );
}
