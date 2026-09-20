"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { StateMessage } from "@/components/ui";

/** Redirect away from /read/* when the domain was off at load. */
export function ReadGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { enabled, isLoading, failed } = useReadEnabled();

  useEffect(() => {
    if (isLoading || failed) return;
    if (!enabled) router.replace("/dashboard");
  }, [isLoading, failed, enabled, router]);

  if (isLoading) {
    return (
      <div className="py-8">
        <StateMessage variant="loading" className="mt-0" />
      </div>
    );
  }
  if (failed) {
    return (
      <div className="py-8">
        <StateMessage variant="error" className="mt-0">
          Could not load feature flags.
        </StateMessage>
      </div>
    );
  }
  if (!enabled) {
    return (
      <div className="py-8">
        <StateMessage variant="error" className="mt-0">
          Read is disabled on this instance
        </StateMessage>
      </div>
    );
  }
  return <>{children}</>;
}
