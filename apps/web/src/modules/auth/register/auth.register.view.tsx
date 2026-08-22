"use client";

import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { AuthFormAbuseFields } from "@/components/auth/AuthFormAbuseFields";
import { BrandMark } from "@/components/BrandMark";
import { LandingBackground } from "@/components/LandingBackground";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import type { RegisterViewProps } from "./auth.register.types";

export const RegisterView = (props: Record<string, unknown>) => {
  const {
    error,
    setError,
    pending,
    challenge,
    challengeLoading,
    refreshChallenge,
    onSubmit,
    closed,
  } = props as RegisterViewProps;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <AuthErrorToast message={error} onDismiss={() => setError(null)} />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
        <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
          Create account
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Email and password only. Link Steam later from Connections.
        </p>

        {closed ? (
          <p className="mt-8 text-sm text-[var(--warm)]" role="alert">
            Registration is currently closed on this instance.
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            className="relative mt-8 space-y-4"
            autoComplete="on"
          >
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
                autoComplete="new-password"
                className="mt-1 w-full border border-[var(--line)] bg-[var(--bg-1)] px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--line-strong)]"
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Confirm password</span>
              <input
                name="confirmPassword"
                type="password"
                required
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
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
                {pending ? "Creating…" : "Create account"}
              </Button>
            )}
          </form>
        )}

        <p className="mt-6 text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
