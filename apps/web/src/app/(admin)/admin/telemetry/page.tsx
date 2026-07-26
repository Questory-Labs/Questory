"use client";

import { TelemetryDashboard } from "@/components/enterprise/TelemetryDashboard";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";

/**
 * Admin OTEL / AI usage dashboard. Hidden from nav when the private
 * enterprise API extension is absent.
 */
export default function AdminTelemetryPage() {
  const { enabled, isLoading } = useEnterpriseEnabled();

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--muted)]">Checking QEngine…</p>
    );
  }

  if (!enabled) {
    return (
      <p className="text-sm text-[var(--muted)]">
        QEngine telemetry is not available on this instance.
      </p>
    );
  }

  return <TelemetryDashboard />;
}
