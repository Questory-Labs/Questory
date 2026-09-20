import { StatusPage } from "@/components/StatusPage";

/** Static preview of `app/error.tsx` — render successfully instead of throwing. */
export default function Test500Page() {
  return (
    <StatusPage
      code="500"
      eyebrow="Sync interrupted"
      title="The quest log glitched"
      taglineContext="serverError"
      logLine="quest log › unhandled_exception — status: 500"
      tone="warm"
      primary={{ label: "Try again", href: "/test/500", variant: "primary" }}
      secondary={{ label: "Back to dashboard", href: "/dashboard" }}
    />
  );
}
