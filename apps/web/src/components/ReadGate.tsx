"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { StateMessage } from "@/components/ui";

/** Redirect away from /read/* when flag off or health fails. */
export function ReadGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { enabled, flag, health } = useReadEnabled();

  useEffect(() => {
    if (!flag) {
      router.replace("/dashboard");
      return;
    }
    if (health.isSuccess && !health.data?.ok) {
      router.replace("/dashboard");
    }
  }, [flag, health.isSuccess, health.data?.ok, router]);

  if (!flag || health.isLoading) {
    return (
      <div className="py-8">
        <StateMessage variant="loading" className="mt-0">
          Loading read…
        </StateMessage>
      </div>
    );
  }
  if (!enabled) {
    return (
      <div className="py-8">
        <StateMessage variant="error" className="mt-0">
          Read analytics is unavailable. Start the API and set
          NEXT_PUBLIC_ENABLE_READ=true.
        </StateMessage>
      </div>
    );
  }
  return <>{children}</>;
}
