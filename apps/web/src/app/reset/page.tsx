"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStore } from "@questorylabs/qhttp/react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";
import { parseApiError, resetPassword } from "@/lib/auth-api";

function ResetInner() {
  const router = useRouter();
  const store = useStore();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") || "");
    setError(null);
    setPending(true);
    try {
      await resetPassword(token, password);
      await store.touch(["me"]);
      router.replace("/dashboard");
    } catch (err) {
      setError(parseApiError(err).message || "Could not reset password");
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
        <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
          Missing reset link
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Request a new password reset from the sign-in page.
        </p>
        <Link href="/login" className="mt-6 text-sm underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
      <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
        Choose a new password
      </h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-sm">
          <span className="text-[var(--muted)]">New password</span>
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
        {error ? (
          <p className="text-sm text-[var(--warm)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Update password"}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <Suspense fallback={null}>
        <ResetInner />
      </Suspense>
    </div>
  );
}
