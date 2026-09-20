"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { StateMessage } from "@/components/ui";

/** Redirect away from /music/* when the domain was off at load. */
export function MusicGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { showMusicNav, isLoading, failed } = useMusicEnabled();

  useEffect(() => {
    if (isLoading || failed) return;
    if (!showMusicNav) router.replace("/dashboard");
  }, [isLoading, failed, showMusicNav, router]);

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
  if (!showMusicNav) {
    return (
      <div className="py-8">
        <StateMessage variant="error" className="mt-0">
          Music is disabled on this instance
        </StateMessage>
      </div>
    );
  }
  return <>{children}</>;
}
