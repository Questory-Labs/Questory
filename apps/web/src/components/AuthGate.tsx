"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-0)] text-sm text-[var(--muted)]">
        {me.isError ? "Redirecting to sign in…" : "Checking session…"}
      </div>
    );
  }

  return <>{children}</>;
}
