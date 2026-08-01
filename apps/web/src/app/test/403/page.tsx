import { StatusPage } from "@/components/StatusPage";

/** Static preview — Next.js has no built-in 403 boundary. */
export default function Test403Page() {
  return (
    <StatusPage
      code="403"
      eyebrow="Access denied"
      title="You shall not pass (yet)"
      description="This corner of Questory needs different credentials, a feature flag, or a stern talking-to from an admin."
      logLine="quest log › authorize — status: 403 · clearance: insufficient"
      tone="danger"
      primary={{ label: "Sign in", href: "/login" }}
      secondary={{ label: "All previews", href: "/test" }}
    />
  );
}
