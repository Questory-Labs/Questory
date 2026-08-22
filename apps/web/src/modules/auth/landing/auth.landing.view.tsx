"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrandMark } from "@/components/BrandMark";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";
import { enterEase } from "./auth.landing.constants";
import type { LandingViewProps } from "./auth.landing.types";

export const LandingView = (props: Record<string, unknown>) => {
  const { showRegister } = props as LandingViewProps;

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
          {showRegister ? (
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
};
