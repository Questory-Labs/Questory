"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { StateMessage } from "@/components/ui";

/** Redirect away from /watch/* when flag off or health fails. */
export function WatchGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { enabled, flag, health } = useWatchEnabled();

  useEffect(() => {
    if (!flag) {
      router.replace("/dashboard");
      return;
    }
    if (health.ready && !health.value?.ok) {
      router.replace("/dashboard");
    }
  }, [flag, health.ready, health.value?.ok, router]);

  if (!flag || (health.empty && health.busy)) {
    return (
      <div className="py-8">
        <StateMessage variant="loading" className="mt-0" />
      </div>
    );
  }
  if (!enabled) {
    return (
      <div className="py-8">
        <StateMessage variant="error" className="mt-0">
          Watch analytics is unavailable. Start the watch service and set
          NEXT_PUBLIC_ENABLE_WATCH=true.
        </StateMessage>
      </div>
    );
  }
  return <>{children}</>;
}
