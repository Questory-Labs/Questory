import { StatusPage } from "@/components/StatusPage";

export default function AdminNotFound() {
  return (
    <StatusPage
      layout="embedded"
      code="404"
      eyebrow="Not found"
      title="This admin page"
      titleAccent="doesn’t exist"
      taglineContext="notFound"
      logLine="quest log › admin_route — result: null · clearance: insufficient_or_typo"
      tone="ink"
      primary={{ label: "Admin home", href: "/admin" }}
      secondary={{ label: "Back to app", href: "/dashboard" }}
    />
  );
}
