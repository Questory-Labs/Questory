import { Suspense } from "react";
import { QmonitorAuthorizeController } from "@/modules/auth/oauth-qmonitor/auth.oauth-qmonitor.controller";
import { QmonitorAuthorizeView } from "@/modules/auth/oauth-qmonitor/auth.oauth-qmonitor.view";

export default function QmonitorAuthorizePage() {
  return (
    <Suspense
      fallback={<p className="p-8 text-sm text-[var(--muted)]">Loading…</p>}
    >
      <QmonitorAuthorizeController>
        <QmonitorAuthorizeView />
      </QmonitorAuthorizeController>
    </Suspense>
  );
}
