"use client";

import Link from "next/link";
import { Panel } from "@questorylabs/ui";
import { GameCover } from "@/components/GameCover";

export const ContinueHero = ({
  href,
  name,
  headerImage,
  caption,
}: {
  href: string;
  name: string;
  headerImage: string | null;
  caption: string;
}) => (
  <Link href={href} className="block max-w-xl">
    <Panel size="lg" className="overflow-hidden">
      <GameCover src={headerImage} className="w-full" />
      <div className="border-t border-[var(--line)] px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          Continue
        </p>
        <h2 className="mt-1 truncate font-display text-2xl font-bold">{name}</h2>
        <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">{caption}</p>
      </div>
    </Panel>
  </Link>
);
