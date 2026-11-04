import { StatusPage } from "@/components/StatusPage";

/** Static preview of `app/error.tsx` — render successfully instead of throwing. */
export default function Test500Page() {
  return (
    <StatusPage
      code="500"
      eyebrow="Server error"
      title="Something broke"
      titleAccent="on our side"
      taglineContext="serverError"
      logLine="quest log › unhandled_exception — status: 500"
      tone="danger"
      primary={{ label: "Try again", href: "/test/500", variant: "primary" }}
      secondary={{ label: "Back to dashboard", href: "/dashboard" }}
      reference="req-preview-0000"
    />
  );
}
