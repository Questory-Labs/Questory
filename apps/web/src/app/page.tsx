"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useResource } from "@questorylabs/qhttp/react";
import { fetchSignupStatus } from "@/lib/auth-api";
import { useUser } from "@/hooks/useUser";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";

const enterEase = [0.22, 1, 0.36, 1] as const;

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated } = useUser();
  const signup = useResource({
    id: ["signup-status"],
    load: fetchSignupStatus,
    retries: false,
  });

  useEffect(() => {
    if (isAuthenticated) router.replace("/dashboard");
  }, [isAuthenticated, router]);

  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    return () => document.documentElement.classList.remove("landing-active");
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: enterEase }}
        >
          <BrandMark
            href={null}
            size="lg"
            wordmarkClassName="text-6xl md:text-8xl"
            className="gap-4 md:gap-5"
          />
        </motion.div>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12, ease: enterEase }}
          className="mt-6 max-w-xl text-lg text-[var(--muted)] md:text-xl"
        >
          Play, listen, and watch — weekly insights across your Steam library,
          music, and media.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24, ease: enterEase }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <Link href="/login" className="inline-block">
            <HatchShadow
              size="sm"
              faceClassName="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--bg-0)] hover:brightness-110"
            >
              Sign in
            </HatchShadow>
          </Link>
          {signup.value?.open !== false ? (
            <Link href="/register" className="inline-block">
              <HatchShadow
                size="sm"
                faceClassName="border border-[var(--line)] bg-[var(--bg-1)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:border-[var(--line-strong)]"
              >
                Create account
              </HatchShadow>
            </Link>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
