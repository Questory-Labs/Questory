import { StatusPage } from "@/components/StatusPage";

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      eyebrow="Not found"
      title="We couldn’t"
      titleAccent="find that"
      taglineContext="notFound"
      logLine="quest log › locate_page — result: null · errno: SIDEQUEST_NOT_FOUND"
      tone="ink"
      primary={{ label: "Back to dashboard", href: "/dashboard" }}
      secondary={{ label: "Return home", href: "/" }}
    />
  );
}
