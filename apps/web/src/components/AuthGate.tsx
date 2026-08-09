"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingPage } from "@/components/LoadingPage";
import { apiOnce } from "@/lib/api";

type MeResponse = {
  user: {
    id: string;
    steamId: string | null;
    personaName: string;
    avatarUrl: string | null;
  } | null;
};

/** Soft session gate for pages that are not wrapped by AppShell. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const me = useResource({
    id: ["me"],
    load: () => apiOnce<MeResponse>("/auth/me"),
    retries: false,
  });

  const user = me.value?.user ?? null;
  const authReady = me.ready || me.failed;

  useEffect(() => {
    if (!authReady) return;
    if (!user) router.replace("/login");
  }, [authReady, user, router]);

  if (!authReady || !user) {
    if (me.failed) {
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
