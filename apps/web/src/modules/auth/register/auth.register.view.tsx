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
import { useState, type FormEvent } from "react";
import type { RegisterViewProps } from "./auth.register.types";

const MIN_PASSWORD = 10;

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
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  const onInput = (e: FormEvent<HTMLFormElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.name === "password") setPassword(target.value);
    if (target.name === "confirmPassword") setConfirm(target.value);
  };

  return (
    <>
      <AuthErrorToast message={error} onDismiss={() => setError(null)} />
      <div className="w-full max-w-[400px]">
        <AuthHeading
          eyebrow="New account"
          title="Create"
          accent="an account."
          sub="Connect Steam, music, watch and read sources after."
        />

        {closed ? (
          <div
            role="alert"
            className="panel q-in flex flex-col gap-2.5 rounded-[var(--radius-panel)] p-[22px] [--i:4]"
          >
            <span className="pill self-start text-[var(--warn)]">
              <span aria-hidden className="dot" />
              Closed
            </span>
            <p className="m-0 text-[17px] text-[var(--ink)]">
              Signup is closed on this instance
            </p>
            <p className="m-0 text-sm text-[var(--muted)]">
              Ask the admin for an account, or run your own copy.
            </p>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            onInput={onInput}
            autoComplete="on"
            className="panel q-in relative flex flex-col gap-3.5 rounded-[var(--radius-panel)] p-[22px] [--i:4]"
          >
            <AuthFormAbuseFields />
            <AuthField
              label="Email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <AuthField
                label="Password"
                name="password"
                type="password"
                required
                minLength={MIN_PASSWORD}
                maxLength={128}
                autoComplete="new-password"
                aria-describedby="register-password-hint"
              />
              <p
                id="register-password-hint"
                className="m-0 font-mono text-[10.5px] text-[var(--faint)]"
              >
                At least {MIN_PASSWORD} characters.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <AuthField
                label="Confirm password"
                name="confirmPassword"
                type="password"
                required
                minLength={MIN_PASSWORD}
                maxLength={128}
                autoComplete="new-password"
                invalid={mismatch}
                aria-describedby={mismatch ? "register-mismatch" : undefined}
              />
              {mismatch ? (
                <p
                  id="register-mismatch"
                  className="m-0 font-mono text-[10.5px] text-[#ffb0b0]"
                >
                  Passwords don&apos;t match.
                </p>
              ) : null}
            </div>
            {error ? <AuthAlert>{error}</AuthAlert> : null}
            {!challenge && !challengeLoading ? (
              <Button
                type="button"
                variant="secondary"
                className="min-h-[50px] w-full"
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
                variant="primary"
                className="mt-1 min-h-[50px] w-full text-[15px]"
                disabled={!challenge || pending}
              >
                {pending ? "Creating…" : "Create account"}
              </Button>
            )}
          </form>
        )}

        <p className="q-in mt-5 text-center text-sm text-[var(--muted)] [--i:5]">
          Have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--ink)] underline decoration-[var(--line-strong)] underline-offset-4 hover:decoration-[var(--ink)]"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
};
