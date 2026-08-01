import { StatusPage } from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      eyebrow="Achievement unlocked"
      title="This page isn’t in your library"
      description="We checked the shelf, the backlog, and that one folder called “misc.” Nothing here — maybe a typo, maybe a side quest that was never shipped."
      logLine="quest log › locate_page — result: null · errno: SIDEQUEST_NOT_FOUND"
      tone="mint"
      primary={{ label: "Back to dashboard", href: "/dashboard" }}
      secondary={{ label: "Return home", href: "/" }}
    />
  );
}
