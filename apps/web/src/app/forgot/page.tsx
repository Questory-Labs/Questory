"use client";

import { FormEvent, useState } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";
import { parseApiError, requestPasswordReset } from "@/lib/auth-api";
import Link from "next/link";

export default function ForgotPage() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") || "");
    setError(null);
    setPending(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(parseApiError(err).message || "Could not send reset email");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
        <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
          Reset password
        </h1>
        {sent ? (
          <p className="mt-4 text-sm text-[var(--accent)]">
            If that account exists, a reset link is on its way.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
            {error ? (
              <p className="text-sm text-[var(--warm)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={pending}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        )}
        <Link href="/login" className="mt-6 text-sm underline">
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
