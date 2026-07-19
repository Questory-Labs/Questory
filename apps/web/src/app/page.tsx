"use client";

import { motion } from "framer-motion";
import { steamLoginUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";

const enterEase = [0.22, 1, 0.36, 1] as const;

export default function LandingPage() {
  const router = useRouter();
  const me = useQuery({
    queryKey: ["me"],
    queryFn: () =>
      api<{ user: { id: string } | null }>("/auth/me"),
  });

  useEffect(() => {
    if (me.data?.user) router.replace("/dashboard");
  }, [me.data, router]);

  useEffect(() => {
    document.documentElement.classList.add("landing-active");
    return () => document.documentElement.classList.remove("landing-active");
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: enterEase }}
          className="font-display text-6xl leading-none tracking-tight md:text-8xl"
          style={{ fontWeight: 800 }}
        >
          Questory{" "}
          <span className="text-[var(--accent)]">Labs</span>
        </motion.p>
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
          <a href={steamLoginUrl()} className="inline-block">
            <HatchShadow
              size="sm"
              faceClassName="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[var(--bg-0)] hover:brightness-110"
            >
              Sign in with Steam
            </HatchShadow>
          </a>
        </motion.div>
      </div>
    </div>
  );
}
