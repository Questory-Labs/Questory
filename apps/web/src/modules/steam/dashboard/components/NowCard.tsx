"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { cn } from "@questorylabs/ui";
import type { NowCardModel } from "../dashboard-now";
import { NowIllustration } from "./NowIllustration";

export const ArrowGlyph = ({ size = 13 }: { size?: number }) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
  >
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export const NowCard = ({
  card,
  index,
  lead = false,
}: {
  card: NowCardModel;
  index: number;
  lead?: boolean;
}) => (
  <Link
    href={card.href}
    className={cn(
      "group panel q-lift q-in relative flex flex-col gap-3 overflow-hidden p-[18px] no-underline",
      lead &&
        "[background-image:linear-gradient(160deg,rgba(210,210,214,0.22),rgba(255,255,255,0.02)_55%)]",
    )}
    style={{ "--i": index } as CSSProperties}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p
          className="m-0 font-mono text-[10px] uppercase tracking-[0.08em]"
          style={{ color: card.color }}
        >
          {card.kind}
        </p>
        <h3 className="mt-1 truncate text-[19px] font-normal tracking-[-0.01em]">
          {card.title}
        </h3>
        {card.sub ? (
          <p className="mt-px text-xs text-[var(--faint)]">{card.sub}</p>
        ) : null}
      </div>
      <span className="grid size-8 flex-none place-items-center rounded-full text-[var(--ink)] transition-colors group-hover:bg-white/10">
        <ArrowGlyph />
      </span>
    </div>
    <div className="relative grid h-[118px] place-items-center">
      <NowIllustration kind={card.illustration} color={card.color} />
      {card.badge ? (
        <span className="absolute inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-[rgba(20,20,22,0.85)] py-1 pl-1 pr-3 text-[13px] font-normal backdrop-blur-[8px]">
          <span
            aria-hidden="true"
            className="grid size-[22px] place-items-center rounded-full border border-white/40 text-[11px]"
          >
            {card.badgeKey}
          </span>
          {card.badge}
        </span>
      ) : null}
    </div>
    <div className="flex items-center gap-2.5 text-xs text-[#a1a1a6]">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-white/10 px-[11px] py-1",
          card.live ? "text-[var(--ok)]" : "text-[#a1a1a6]",
        )}
      >
        <span
          aria-hidden="true"
          className={cn("size-[5px] rounded-full bg-current", card.live && "q-live")}
        />
        {card.status}
      </span>
      {card.sources[0] ? <span className="ml-auto">{card.sources[0]}</span> : null}
      {card.sources[1] ? (
        <span className="text-[var(--faint)]">{card.sources[1]}</span>
      ) : null}
    </div>
  </Link>
);
