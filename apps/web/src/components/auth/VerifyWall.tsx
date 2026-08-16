"use client";

import { useAction, useStore } from "@questorylabs/qhttp/react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { resendVerification } from "@/lib/auth-api";
import { api } from "@/lib/api";

export function VerifyWall({
  email,
}: {
  email?: string | null;
}) {
  const router = useRouter();
  const store = useStore();

  const resend = useAction({
    run: () => resendVerification(),
  });

  const logout = useAction({
    run: () => api("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      store.drop();
      router.push("/login");
    },
  });

  return (
    <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
      <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
        Verify your email
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        {email
          ? `We sent a link to ${email}. Confirm it to use Questory.`
          : "Confirm the link we sent to your email to use Questory."}
      </p>
      {resend.ok ? (
        <p className="mt-4 text-sm text-[var(--accent)]">Link sent.</p>
      ) : null}
      {resend.error ? (
        <p className="mt-4 text-sm text-[var(--warm)]" role="alert">
          {resend.error.message}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={resend.busy}
          onClick={() => resend.submit()}
        >
          {resend.busy ? "Sending…" : "Resend email"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={logout.busy}
          onClick={() => logout.submit()}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
