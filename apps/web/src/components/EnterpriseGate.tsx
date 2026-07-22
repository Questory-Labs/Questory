"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEnterpriseEnabled } from "@/hooks/useEnterpriseEnabled";
import { StateMessage } from "@/components/ui";

/** Redirect away from enterprise routes when the private extension is absent. */
export function EnterpriseGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { enabled, isLoading } = useEnterpriseEnabled();

  useEffect(() => {
    if (!isLoading && !enabled) {
      router.replace("/dashboard");
    }
  }, [enabled, isLoading, router]);

  if (isLoading) {
    return (
      <div className="py-8">
        <StateMessage variant="loading" className="mt-0">
          Checking recommendations…
        </StateMessage>
      </div>
    );
  }
  if (!enabled) return null;
  return <>{children}</>;
}
