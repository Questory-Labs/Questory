"use client";

import { motion } from "framer-motion";
import { steamLoginUrl } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { HatchShadow } from "@/components/HatchShadow";

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

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "url(https://cdn.cloudflare.steamstatic.com/steam/apps/570/library_hero.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "saturate(0.7) brightness(0.35)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-6xl leading-none tracking-tight md:text-8xl"
          style={{ fontWeight: 800 }}
        >
          Questory{" "}
          <span className="text-[var(--accent)]">Labs</span>
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 max-w-xl text-lg text-[var(--muted)] md:text-xl"
        >
          Turn your Steam library into weekly insights — what to play, what to
          buy, and who to play with.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <a href={steamLoginUrl()} className="inline-block">
            <HatchShadow
              size="sm"
              faceClassName="bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-[#101012] hover:brightness-110"
            >
              Sign in with Steam
            </HatchShadow>
          </a>
          <span className="self-center text-sm text-[var(--muted)]">
            Library analytics · Wishlist intel · Multiplayer planning
          </span>
        </motion.div>
      </div>
    </div>
  );
}
