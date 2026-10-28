"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMorphIndex } from "@/components/auth/AuthMorphAside";
import { BrandMark } from "@/components/BrandMark";
import { DotCanvas } from "@/components/dots/DotCanvas";
import { createMorphPainter, MORPH_GRID } from "@/components/dots/dot-painters";
import type { LandingViewProps } from "./auth.landing.types";

const WORDS = [
  { word: "played", color: "text-[var(--games)]" },
  { word: "heard", color: "text-[var(--music)]" },
  { word: "watched", color: "text-[var(--watch)]" },
  { word: "read", color: "text-[var(--read)]" },
] as const;

const DOMAINS = [
  {
    n: "01",
    title: "Library",
    dot: "text-[var(--games)]",
    body: "Steam shelf, playtime, backlog, and cost per hour — what you own and what it actually costs to play.",
  },
  {
    n: "02",
    title: "Music",
    dot: "text-[var(--music)]",
    body: "ListenBrainz pulse: heatmap, now playing, and charts from the scrobbles you already keep.",
  },
  {
    n: "03",
    title: "Watch",
    dot: "text-[var(--watch)]",
    body: "Movies and TV from Trakt, Letterboxd, AniList, and player webhooks — hour and day, not a clone of Library.",
  },
  {
    n: "04",
    title: "Read",
    dot: "text-[var(--read)]",
    body: "Manga, manhwa, and print from AniList. Chapters logged, formats, the same charts.",
  },
] as const;

const silverCta = "btn btn-primary min-h-12 px-[22px] text-[15px]";
const ghostCta = "btn btn-ghost min-h-12 px-[22px] text-[15px]";

export const LandingView = (props: Record<string, unknown>) => {
  const { showRegister } = props as LandingViewProps;
  const paint = useMemo(() => createMorphPainter(), []);
  const active = WORDS[useMorphIndex(WORDS.length)];

  return (
    <div className="min-h-screen bg-[var(--bg-0)] text-[var(--ink)]">
      <div className="sticky top-0 z-20 flex justify-center px-4 pt-4">
        <header className="q-in flex w-full max-w-[1180px] items-center justify-between gap-3 rounded-full border border-white/[0.08] bg-[rgba(20,20,22,0.6)] py-1.5 pr-1.5 pl-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-[18px]">
          <BrandMark href={null} size="sm" wordmarkClassName="text-lg" />
          <nav className="flex items-center gap-1" aria-label="Landing">
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
            >
              Sign in
            </Link>
            {showRegister ? (
              <Link
                href="/register"
                className="btn btn-primary min-h-[38px] rounded-full px-4 text-sm"
              >
                Create account
              </Link>
            ) : null}
          </nav>
        </header>
      </div>

      <section
        aria-labelledby="landing-hero"
        className="relative mx-auto max-w-[1180px] overflow-hidden px-4 pt-16 pb-20 md:pt-24"
      >
        <DotCanvas
          paint={paint}
          width={MORPH_GRID.w * MORPH_GRID.step}
          height={MORPH_GRID.h * MORPH_GRID.step}
          className="pointer-events-none absolute top-6 right-[-6%] w-[min(640px,70vw)] opacity-70"
        />
        <p className="q-in relative m-0 inline-flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(10,10,11,0.6)] px-3.5 py-[5px] font-mono text-[11px] tracking-[0.06em] text-[#a1a1a6] [--i:1]">
          <span aria-hidden className="dot q-live h-[5px] w-[5px] text-[var(--ok)]" />
          Self-hosted · source-available · Steam-first
        </p>
        <h1
          id="landing-hero"
          className="q-in relative mt-[22px] mb-0 max-w-[900px] text-[clamp(44px,7vw,96px)] font-normal leading-[0.98] tracking-[-0.05em] [--i:2]"
        >
          Every hour you{" "}
          <span
            key={active.word}
            className={`q-slide font-serif tracking-[-0.02em] ${active.color}`}
          >
            {active.word}
          </span>
          , remembered.
        </h1>
        <p className="q-in relative mt-6 max-w-xl text-lg text-[var(--muted)] [--i:3]">
          Weekly insights across your Steam library, music, and media.
          Personal and noncommercial self-hosting.
        </p>
        <div className="q-in relative mt-9 flex flex-wrap gap-2.5 [--i:4]">
          <Link href="/login" className={silverCta}>
            Sign in
          </Link>
          {showRegister ? (
            <Link href="/register" className={ghostCta}>
              Create account
            </Link>
          ) : null}
        </div>
        <p className="q-in relative mt-14 mb-0 font-serif text-lg text-[var(--faint)] [--i:5]">
          play. listen. watch. read.
        </p>
      </section>

      <section
        aria-labelledby="landing-modules"
        className="mx-auto max-w-[1180px] px-4 pb-24"
      >
        <p className="m-0 font-mono text-[11px] tracking-[0.08em] text-[var(--faint)]">
          01 — MODULES
        </p>
        <h2
          id="landing-modules"
          className="mt-3.5 mb-0 max-w-[760px] text-[clamp(36px,4.6vw,64px)] font-light leading-none tracking-[-0.045em]"
        >
          Play first.{" "}
          <span className="font-serif text-[#a1a1a6]">
            Then listen, watch and read.
          </span>
        </h2>
        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          {DOMAINS.map((d, i) => (
            <article
              key={d.n}
              className="panel q-in q-lift p-[22px]"
              style={{ "--i": i } as React.CSSProperties}
            >
              <p className="m-0 flex items-center gap-2 font-mono text-[11px] text-[var(--faint)]">
                <span aria-hidden className={`dot ${d.dot}`} />
                /{d.n}
              </p>
              <h3 className="mt-4 mb-0 text-[34px] font-light tracking-[-0.03em]">
                {d.title}
              </h3>
              <p className="mt-2 mb-0 text-sm text-[var(--muted)]">{d.body}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 pt-6 pb-10 text-[13px] text-[var(--faint)]">
        <span className="font-serif text-base">
          play. listen. watch. read. questory
        </span>
        <Link href="/login" className="hover:text-[var(--ink)]">
          Sign in
        </Link>
      </footer>
    </div>
  );
};
