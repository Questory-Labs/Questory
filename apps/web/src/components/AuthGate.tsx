"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingPage } from "@/components/LoadingPage";
import { useUser } from "@/hooks/useUser";

/** Soft session gate for pages that are not wrapped by AppShell. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, authReady, failed } = useUser();

  useEffect(() => {
    if (!authReady) return;
    if (!user) router.replace("/login");
  }, [authReady, user, router]);

  if (!authReady || !user) {
    if (failed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
          Redirecting to sign in…
        </div>
      );
    }
    return (
      <LoadingPage
        title="Checking session"
        logLine="quest log › auth_me — status: in_progress"
      />
    );
  }

  return <>{children}</>;
}
