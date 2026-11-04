import { StatusPage } from "@/components/StatusPage";

/** Static preview — Next.js has no built-in 400 boundary. */
export default function Test400Page() {
  return (
    <StatusPage
      code="400"
      eyebrow="Bad request"
      title="That link doesn’t"
      titleAccent="look right"
      description="Something in the address is malformed. Check where you copied it from."
      logLine="quest log › parse_request — status: 400 · errno: BAD_SPELLING"
      tone="warn"
      primary={{ label: "Back to dashboard", href: "/dashboard" }}
      secondary={{ label: "All previews", href: "/test" }}
    />
  );
}
