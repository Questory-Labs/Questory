import { StatusPage } from "@/components/StatusPage";

/** Static preview — Next.js has no built-in 403 boundary. */
export default function Test403Page() {
  return (
    <StatusPage
      code="403"
      eyebrow="No access"
      title="This page is"
      titleAccent="for admins"
      description="Your account can’t open it. If you think that’s wrong, ask the admin of this instance."
      logLine="quest log › authorize — status: 403 · clearance: insufficient"
      tone="warn"
      primary={{ label: "Sign in", href: "/login" }}
      secondary={{ label: "All previews", href: "/test" }}
    />
  );
}
