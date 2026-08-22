"use client";

import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { AuthFormAbuseFields } from "@/components/auth/AuthFormAbuseFields";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { LoginViewProps } from "./auth.login.types";

export const LoginView = (props: Record<string, unknown>) => {
  const {
    error,
    setError,
    pending,
    challenge,
    challengeLoading,
    refreshChallenge,
    onSubmit,
  } = props as LoginViewProps;

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
        <p className="mt-6 text-sm text-[var(--muted)]">
          No account?{" "}
          <Link href="/register" className="text-[var(--ink)] underline">
            Register
          </Link>
        </p>
      </div>
    </>
  );
};
