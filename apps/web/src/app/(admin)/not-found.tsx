import { StatusPage } from "@/components/StatusPage";

export default function AdminNotFound() {
  return (
    <StatusPage
      layout="embedded"
      code="404"
      eyebrow="Admin console"
      title="This lever doesn’t exist"
      description="Either you need higher clearance, or someone typed a URL that never made it past code review. The cron jobs are still running — they’re just not here."
      logLine="quest log › admin_route — result: null · clearance: insufficient_or_typo"
      tone="warm"
      primary={{ label: "Admin home", href: "/admin" }}
      secondary={{ label: "Back to app", href: "/dashboard" }}
    />
  );
}
