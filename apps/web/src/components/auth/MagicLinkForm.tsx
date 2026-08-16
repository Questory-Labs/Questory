"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { requestMagicLink, parseApiError } from "@/lib/auth-api";

export function MagicLinkForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const email = String(new FormData(e.currentTarget).get("email") || "");
    try {
      await requestMagicLink(email);
      setSent(true);
    } catch (err) {
      setError(parseApiError(err).message || "Could not send link");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <p className="mt-4 text-sm text-[var(--accent)]">
        If that address can sign in, a link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3">
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
        {pending ? "Sending…" : "Email me a link"}
      </Button>
    </form>
  );
}
