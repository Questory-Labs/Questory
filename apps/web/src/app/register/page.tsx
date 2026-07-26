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
  fetchRegisterChallenge,
  fetchSignupStatus,
  parseApiError,
  registerAccount,
  type AuthChallenge,
} from "@/lib/auth-api";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";

export default function RegisterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: { id: string } | null }>("/auth/me"),
  });
  const signup = useQuery({
    queryKey: ["signup-status"],
    queryFn: fetchSignupStatus,
  });

  useEffect(() => {
    if (me.data?.user) router.replace("/dashboard");
  }, [me.data, router]);

  useEffect(() => {
    if (signup.data && !signup.data.open) return;
    let cancelled = false;
    fetchRegisterChallenge()
      .then((c) => {
        if (!cancelled) setChallenge(c);
      })
      .catch(() => {
        if (!cancelled) setError("Could not start registration. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [signup.data]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!challenge) return;
    setError(null);
    setPending(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const password = String(fd.get("password") || "");
    const confirmPassword = String(fd.get("confirmPassword") || "");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setPending(false);
      return;
    }
    const abuse = readAbuseFields(form);
    try {
      const res = await registerAccount({
        email: String(fd.get("email") || ""),
        password,
        confirmPassword,
        challengeId: challenge.challengeId,
        challengeToken: challenge.token,
        ...abuse,
      });
      if (res.ok && res.user) {
        await qc.invalidateQueries({ queryKey: ["me"] });
        router.replace("/dashboard");
        return;
      }
      // Honeypot fake success or odd response
      if (res.ok && !res.user) {
        router.replace("/login");
        return;
      }
      setError("Unable to create account");
    } catch (err) {
      const parsed = parseApiError(err);
      setError(
        parsed.status === 429
          ? "Too many attempts, try again later"
          : "Unable to create account",
      );
      try {
        setChallenge(await fetchRegisterChallenge());
      } catch {
        // keep
      }
    } finally {
      setPending(false);
    }
  }

  const closed = signup.data && !signup.data.open;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
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
              <p className="text-sm text-[var(--warm)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={!challenge || pending}
              className="w-full"
            >
              {pending ? "Creating…" : "Create account"}
            </Button>
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
}
