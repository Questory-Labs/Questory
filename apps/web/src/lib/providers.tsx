"use client";

import { QHttpQueryProvider } from "@questorylabs/qhttp/react";
import { EnterpriseEnabledProvider } from "@/hooks/useEnterpriseEnabled";

const DEFAULT_QUERY_OPTIONS = {
  queries: {
    staleTime: 30_000,
    retry: 1,
  },
} as const;

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QHttpQueryProvider defaultOptions={DEFAULT_QUERY_OPTIONS}>
      <EnterpriseEnabledProvider>{children}</EnterpriseEnabledProvider>
    </QHttpQueryProvider>
  );
}
