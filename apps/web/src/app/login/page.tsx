"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  AuthFormAbuseFields,
  readAbuseFields,
} from "@/components/auth/AuthFormAbuseFields";
import {
  fetchLoginChallenge,
  loginAccount,
  parseApiError,
  type AuthChallenge,
} from "@/lib/auth-api";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: { id: string } | null }>("/auth/me"),
  });

  useEffect(() => {
    if (me.data?.user) router.replace("/dashboard");
  }, [me.data, router]);

  useEffect(() => {
    let cancelled = false;
    fetchLoginChallenge()
      .then((c) => {
        if (!cancelled) setChallenge(c);
      })
      .catch(() => {
        if (!cancelled) setError("Could not start sign-in. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const abuse = readAbuseFields(form);
    try {
      await loginAccount({
        email: String(fd.get("email") || ""),
        password: String(fd.get("password") || ""),
        challengeId: challenge.challengeId,
        challengeToken: challenge.token,
        ...abuse,
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/dashboard");
    } catch (err) {
      const parsed = parseApiError(err);
      setError(
        parsed.status === 429
          ? "Too many attempts, try again later"
          : parsed.message.includes("Invalid")
            ? "Invalid email or password"
            : parsed.message,
      );
      try {
        setChallenge(await fetchLoginChallenge());
      } catch {
        // keep old challenge
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <Link
          href="/"
          className="font-display text-3xl tracking-tight"
          style={{ fontWeight: 800 }}
        >
          Questory <span className="text-[var(--accent)]">Labs</span>
        </Link>
        <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use your email and password. Steam and other services link from
          Connections after you sign in.
        </p>

        <form onSubmit={onSubmit} className="relative mt-8 space-y-4" autoComplete="on">
          <AuthFormAbuseFields />
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full border border-[var(--line)] bg-[var(--bg-1)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--line-strong)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={10}
              maxLength={128}
              autoComplete="current-password"
              className="mt-1 w-full border border-[var(--line)] bg-[var(--bg-1)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--line-strong)]"
            />
          </label>
          {error ? (
            <p className="text-sm text-[var(--warm)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={!challenge || pending}
            className="w-full"
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-[var(--muted)]">
          No account?{" "}
          <Link href="/register" className="text-[var(--accent)] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
