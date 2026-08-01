import { StatusPage } from "@/components/StatusPage";

/** Static preview — Next.js has no built-in 400 boundary. */
export default function Test400Page() {
  return (
    <StatusPage
      code="400"
      eyebrow="Malformed request"
      title="That URL spoke nonsense"
      description="The quest log couldn’t parse what you sent. Check the link, the form fields, or whatever incantation got you here."
      logLine="quest log › parse_request — status: 400 · errno: BAD_SPELLING"
      tone="warm"
      primary={{ label: "Back to dashboard", href: "/dashboard" }}
      secondary={{ label: "All previews", href: "/test" }}
    />
  );
}
