import Link from "next/link";
import { StatusPage } from "@/components/StatusPage";

export default function AppNotFound() {
  return (
    <StatusPage
      layout="embedded"
      code="404"
      eyebrow="Not found"
      title="We couldn’t"
      titleAccent="find that"
      taglineContext="notFound"
      logLine="quest log › app_route — result: null · hint: check the address bar"
      tone="ink"
      primary={{ label: "Open library", href: "/library" }}
      secondary={{ label: "Dashboard", href: "/dashboard" }}
    >
      <p className="mt-4 text-sm text-[var(--faint)]">
        Know a game this should be?{" "}
        <Link href="/search" className="text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-4">
          Try search
        </Link>
      </p>
    </StatusPage>
  );
}
