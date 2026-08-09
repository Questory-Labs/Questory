"use client";

import { ResourceProvider } from "@questorylabs/qhttp/react";
import { EnterpriseEnabledProvider } from "@/hooks/useEnterpriseEnabled";

const RESOURCE_DEFAULTS = {
  freshFor: 30_000,
  retries: 1,
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ResourceProvider defaults={RESOURCE_DEFAULTS}>
      <EnterpriseEnabledProvider>{children}</EnterpriseEnabledProvider>
    </ResourceProvider>
  );
}
