"use client";

import { useQuery } from "@questorylabs/qhttp/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingPage } from "@/components/LoadingPage";
import { api } from "@/lib/api";

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
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
    retry: false,
  });

  const user = me.data?.user ?? null;
  const authReady = me.isSuccess || me.isError;

  useEffect(() => {
    if (!authReady) return;
    if (!user) router.replace("/login");
  }, [authReady, user, router]);

  if (!authReady || !user) {
    if (me.isError) {
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
