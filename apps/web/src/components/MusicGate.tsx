"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { StateMessage } from "@/components/ui";

/** Redirect away from /music/* when flag off or health fails. */
export function MusicGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { flagOn, showMusicNav, isLoading } = useMusicEnabled();

  useEffect(() => {
    if (!flagOn) {
      router.replace("/dashboard");
      return;
    }
    if (!isLoading && !showMusicNav) {
      router.replace("/dashboard");
    }
  }, [flagOn, showMusicNav, isLoading, router]);

  if (!flagOn) return null;
  if (isLoading) {
    return (
      <div className="py-8">
        <StateMessage variant="loading" className="mt-0">
          Checking music service…
        </StateMessage>
      </div>
    );
  }
  if (!showMusicNav) return null;
  return <>{children}</>;
}
