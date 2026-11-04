"use client";

import { AuthErrorToast } from "@/components/auth/AuthErrorToast";
import { AuthFormAbuseFields } from "@/components/auth/AuthFormAbuseFields";
import {
  AuthAlert,
  AuthField,
  AuthHeading,
} from "@/components/auth/AuthSplitLayout";
import { Button } from "@/components/ui";
import Link from "next/link";
import type { LoginViewProps } from "./auth.login.types";
import { formatCountdown, lockoutTiersCopy } from "./auth.login.utils";

export const LoginView = (props: Record<string, unknown>) => {
  const {
    error,
    setError,
    pending,
    credentialError = false,
    lockSecondsLeft = 0,
    challenge,
    challengeLoading,
    refreshChallenge,
    onSubmit,
  } = props as LoginViewProps;
  const locked = lockSecondsLeft > 0;

  return (
    <>
      <AuthErrorToast message={error} onDismiss={() => setError(null)} />
      <div className="w-full max-w-[400px]">
        <AuthHeading
          eyebrow="Account"
          title="Sign"
          accent="in."
          sub="Welcome back."
        />
        <form
          onSubmit={onSubmit}
          autoComplete="on"
          aria-describedby={error ? "login-error" : undefined}
          className="panel q-in relative flex flex-col gap-3.5 rounded-[var(--radius-panel)] p-[22px] [--i:4]"
        >
          <AuthFormAbuseFields />
          <AuthField
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            invalid={credentialError}
          />
          <AuthField
            label="Password"
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="current-password"
            invalid={credentialError}
          />
          {error ? <AuthAlert id="login-error">{error}</AuthAlert> : null}
          {!challenge && !challengeLoading ? (
            <Button
              type="button"
              variant="secondary"
              className="min-h-[50px] w-full"
              onClick={() => void refreshChallenge()}
            >
              Retry
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              className="mt-1 min-h-[50px] w-full text-[15px]"
              disabled={pending || challengeLoading || !challenge || locked}
            >
              {locked
                ? `Try again in ${formatCountdown(lockSecondsLeft)}`
                : pending
                  ? "Signing in…"
                  : "Sign in"}
            </Button>
          )}
          <p className="m-0 font-mono text-[10.5px] leading-relaxed text-[var(--faint)]">
            {lockoutTiersCopy()}
          </p>
        </form>
        <p className="q-in mt-5 text-center text-sm text-[var(--muted)] [--i:5]">
          No account?{" "}
          <Link
            href="/register"
            className="text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-[var(--ink)]"
          >
            Create account
          </Link>
        </p>
      </div>
    </>
  );
};
