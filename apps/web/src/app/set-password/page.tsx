"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useResource, useStore } from "@questorylabs/qhttp/react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";
import { AuthGate } from "@/components/AuthGate";
import { apiOnce } from "@/lib/api";
import {
  parseApiError,
  setAccountPassword,
  type AuthMeResponse,
} from "@/lib/auth-api";

function SetPasswordInner() {
  const router = useRouter();
  const store = useStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const me = useResource({
    id: ["me"],
    load: () => apiOnce<AuthMeResponse>("/auth/me"),
    retries: false,
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password") || "");
    setError(null);
    setPending(true);
    try {
      await setAccountPassword({ password });
      await store.touch(["me"]);
      router.replace("/dashboard");
    } catch (err) {
      setError(parseApiError(err).message || "Could not set password");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <BrandMark href="/dashboard" size="md" wordmarkClassName="text-3xl" />
      <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
        Set a password
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Optional — you can keep using magic links. A password lets you sign in
        without waiting on email.
      </p>
      {me.value?.user?.hasPassword ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          This account already has a password.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
          {error ? (
            <p className="text-sm text-[var(--warm)]" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
      <button
        type="button"
        className="mt-6 text-left text-sm underline"
        onClick={() => router.replace("/dashboard")}
      >
        Skip for now
      </button>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <AuthGate>
        <SetPasswordInner />
      </AuthGate>
    </div>
  );
}
