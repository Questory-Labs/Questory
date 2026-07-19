"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { AuthGate } from "@/components/AuthGate";

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
      <div className="px-4 py-10 text-sm text-[var(--muted)]">
        Checking music service…
      </div>
    );
  }
  if (!showMusicNav) return null;
  return <AuthGate>{children}</AuthGate>;
}
