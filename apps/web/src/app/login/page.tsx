"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import { api } from "@/lib/api";
import {
  AuthFormAbuseFields,
  readAbuseFields,
} from "@/components/auth/AuthFormAbuseFields";
import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import {
  fetchLoginChallenge,
  formatAuthError,
  isChallengeKeepAliveError,
  loginAccount,
  parseApiError,
  shouldAutoRetryChallenge,
  type AuthChallenge,
} from "@/lib/auth-api";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";

export default function LoginPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: { id: string } | null }>("/auth/me"),
  });

  useEffect(() => {
    if (me.data?.user) router.replace("/dashboard");
  }, [me.data, router]);

  const refreshChallenge = useCallback(async () => {
    setChallengeLoading(true);
    try {
      const c = await fetchLoginChallenge();
      setChallenge(c);
      return c;
    } catch {
      setChallenge(null);
      setError("Could not start sign-in. Try again.");
      return null;
    } finally {
      setChallengeLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshChallenge();
  }, [refreshChallenge]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const abuse = readAbuseFields(form);
    const credentials = {
      email: String(fd.get("email") || ""),
      password: String(fd.get("password") || ""),
      ...abuse,
    };

    async function attempt(ch: AuthChallenge) {
      await loginAccount({
        ...credentials,
        challengeId: ch.challengeId,
        challengeToken: ch.token,
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.replace("/dashboard");
    }

    try {
      await attempt(challenge);
    } catch (err) {
      const parsed = parseApiError(err);
      if (isChallengeKeepAliveError(parsed.message)) {
        setError(formatAuthError(err, "login"));
        return;
      }
      if (shouldAutoRetryChallenge(parsed.message)) {
        const fresh = await refreshChallenge();
        if (fresh) {
          try {
            await attempt(fresh);
            return;
          } catch (retryErr) {
            const retryParsed = parseApiError(retryErr);
            setError(formatAuthError(retryErr, "login"));
            if (!isChallengeKeepAliveError(retryParsed.message)) {
              await refreshChallenge();
            }
            return;
          }
        }
      }
      setError(formatAuthError(err, "login"));
      await refreshChallenge();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <AuthErrorToast message={error} onDismiss={() => setError(null)} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
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
            <p className="border border-[var(--warm)]/40 bg-[var(--warm)]/10 px-3 py-2 text-sm text-[var(--warm)]" role="alert">
              {error}
            </p>
          ) : null}
          {!challenge && !challengeLoading ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setError(null);
                void refreshChallenge();
              }}
            >
              Retry
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!challenge || pending}
              className="w-full"
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          )}
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
