"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { AuthGate } from "@/components/AuthGate";

/** Redirect away from /watch/* when flag off or health fails. */
export function WatchGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { enabled, flag, health } = useWatchEnabled();

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
      <div className="p-8 text-sm text-[var(--muted)]">Loading watch…</div>
    );
  }
  if (!enabled) {
    return (
      <div className="p-8 text-sm text-[var(--muted)]">
        Watch analytics is unavailable. Start the watch service and set
        NEXT_PUBLIC_ENABLE_WATCH=true.
      </div>
    );
  }
  return <AuthGate>{children}</AuthGate>;
}
