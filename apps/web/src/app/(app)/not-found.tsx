import Link from "next/link";
import { StatusPage } from "@/components/StatusPage";

export default function AppNotFound() {
  return (
    <StatusPage
      layout="embedded"
      code="404"
      eyebrow="Side quest expired"
      title="No save file at this URL"
      description="The main story continues elsewhere. This bookmark might be outdated, or you wandered off the map."
      logLine="quest log › app_route — result: null · hint: check the address bar"
      tone="mint"
      primary={{ label: "Open library", href: "/library" }}
      secondary={{ label: "Dashboard", href: "/dashboard" }}
    >
      <p className="mt-4 text-sm text-[var(--faint)]">
        Know a game this should be?{" "}
        <Link href="/search" className="text-[var(--accent)] hover:underline">
          Try search
        </Link>
      </p>
    </StatusPage>
  );
}
