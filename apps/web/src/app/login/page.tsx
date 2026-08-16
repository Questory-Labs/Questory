"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useCallback, useEffect, useState } from "react";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import { sanitizeAppHref } from "@questorylabs/shared";
import { apiOnce } from "@/lib/api";
import {
  AuthFormAbuseFields,
  readAbuseFields,
} from "@/components/auth/AuthFormAbuseFields";
import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import {
  fetchApiHealth,
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
import { MagicLinkForm } from "@/components/auth/MagicLinkForm";

function safeNextPath(raw: string | null): string {
  if (!raw) return "/dashboard";
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();
  const cleaned = sanitizeAppHref(decoded);
  return cleaned || "/dashboard";
}

function LoginInner() {
  const router = useRouter();
  const store = useStore();
  const search = useSearchParams();
  const nextPath = safeNextPath(search.get("next"));
  const linkError = search.get("error") === "invalid_link";
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const me = useResource({
    id: ["me"],
    load: () => apiOnce<{ user: { id: string } | null }>("/auth/me"),
    retries: false,
  });
  const health = useResource({
    id: ["api-health"],
    load: fetchApiHealth,
    retries: false,
  });
  const mailActive = health.value?.mail?.enabled === true;

  useEffect(() => {
    if (me.value?.user) router.replace(nextPath);
  }, [me.value, router, nextPath]);

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
      await store.touch(["me"]);
      router.replace(nextPath);
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
    <>
      <AuthErrorToast message={error} onDismiss={() => setError(null)} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
        <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Use your email and password. Steam and other services link from
          Connections after you sign in.
        </p>
        {linkError ? (
          <p className="mt-4 text-sm text-[var(--warm)]" role="alert">
            That sign-in link is invalid or expired.
          </p>
        ) : null}

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
            <p
              className="border border-[var(--warm)]/40 bg-[var(--warm)]/10 px-3 py-2 text-sm text-[var(--warm)]"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          {!challenge && !challengeLoading ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshChallenge()}
            >
              Retry
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={pending || challengeLoading || !challenge}
            >
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          )}
        </form>
        {mailActive ? (
          <div className="mt-8 border-t border-[var(--line)] pt-6">
            <h2 className="text-sm font-medium text-[var(--ink)]">
              Sign in with email
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              We’ll send a one-time link. You can set a password after.
            </p>
            <MagicLinkForm />
            <p className="mt-4 text-sm text-[var(--muted)]">
              <Link href="/forgot" className="text-[var(--ink)] underline">
                Forgot password?
              </Link>
            </p>
          </div>
        ) : null}
        <p className="mt-6 text-sm text-[var(--muted)]">
          No account?{" "}
          <Link href="/register" className="text-[var(--ink)] underline">
            Register
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </div>
  );
}
