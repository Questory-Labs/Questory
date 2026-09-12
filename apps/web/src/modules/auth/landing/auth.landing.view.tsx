"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { HatchShadow } from "@/components/HatchShadow";
import { LandingBackground } from "@/components/LandingBackground";
import type { LandingViewProps } from "./auth.landing.types";

const DOMAINS = [
  {
    n: "01",
    title: "Library",
    body: "Steam shelf, playtime, backlog, and cost per hour — what you own and what it actually costs to play.",
  },
  {
    n: "02",
    title: "Music",
    body: "ListenBrainz pulse: heatmap, now playing, and charts from the scrobbles you already keep.",
  },
  {
    n: "03",
    title: "Watch",
    body: "Movies and TV from Trakt, Letterboxd, AniList, and player webhooks — hour and day, not a clone of Library.",
  },
  {
    n: "04",
    title: "Read",
    body: "Manga, manhwa, and print from AniList. Chapters logged, formats, the same hatch charts.",
  },
] as const;

export const LandingView = (props: Record<string, unknown>) => {
  const { showRegister } = props as LandingViewProps;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <LandingBackground />
      <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-6">
        <header className="flex items-center justify-between gap-4">
          <BrandMark href={null} size="sm" wordmarkClassName="text-xl" />
          <nav className="flex flex-wrap items-center gap-3" aria-label="Landing">
            <Link
              href="/login"
              className="text-sm text-[var(--muted)] hover:text-[var(--ink)]"
            >
              Sign in
            </Link>
            {showRegister ? (
              <Link href="/register" className="inline-block">
                <HatchShadow
                  size="sm"
                  faceClassName="bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--bg-0)] hover:brightness-110"
                >
                  Create account
                </HatchShadow>
              </Link>
            ) : null}
          </nav>
        </header>

        <section className="mt-16 max-w-3xl md:mt-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            Steam-first library intelligence
          </p>
          <h1 className="mt-3 font-display text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Play, listen, watch, read — one hatch dashboard.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-[var(--muted)] md:text-xl">
            Weekly insights across your Steam library, music, and media. Personal
            and noncommercial self-hosting. No glass, no fake GIS.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
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
          </div>
        </section>

        <section className="mt-20 grid gap-8 sm:grid-cols-2">
          {DOMAINS.map((d) => (
            <article key={d.n} className="panel-outline p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--accent)]">
                /{d.n}
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold">{d.title}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{d.body}</p>
            </article>
          ))}
        </section>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--line)] pt-8">
          <p className="text-sm text-[var(--muted)]">Questory · hatch, not glass.</p>
          <Link href="/login" className="text-sm text-[var(--accent)] hover:underline">
            Sign in
          </Link>
        </footer>
      </div>
    </div>
  );
};
