"use client";

import { GuardrailsSettings } from "@/components/enterprise/GuardrailsSettings";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";

/**
 * Admin LLM guardrail policy. Hidden from nav when QEngine is absent.
 */
export default function AdminGuardrailsPage() {
  const { enabled, isLoading } = useEnterpriseEnabled();

  if (isLoading) {
    return (
      <p className="text-sm text-[var(--muted)]">Checking QEngine…</p>
    );
  }

  if (!enabled) {
    return (
      <p className="text-sm text-[var(--muted)]">
        QEngine guardrails are not available on this instance.
      </p>
    );
  }

  return <GuardrailsSettings />;
}
