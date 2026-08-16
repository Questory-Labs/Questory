"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { LandingBackground } from "@/components/LandingBackground";
import { VerifyWall } from "@/components/auth/VerifyWall";
import { AuthGate } from "@/components/AuthGate";

function VerifyInner() {
  const search = useSearchParams();
  const invalid = search.get("error") === "invalid_link";

  if (invalid) {
    return (
      <div className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <BrandMark href="/" size="md" wordmarkClassName="text-3xl" />
        <h1 className="mt-8 text-xl font-semibold text-[var(--ink)]">
          Link expired
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Request a new verification email after you sign in.
        </p>
        <Link href="/login" className="mt-6">
          <Button>Sign in</Button>
        </Link>
      </div>
    );
  }

  return (
    <AuthGate>
      <VerifyWall />
    </AuthGate>
  );
}

export default function VerifyPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <Suspense fallback={null}>
        <VerifyInner />
      </Suspense>
    </div>
  );
}
