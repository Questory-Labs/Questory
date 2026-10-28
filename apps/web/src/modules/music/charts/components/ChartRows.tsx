"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import type { MusicTopItem } from "@questorylabs/shared";
import { cn } from "@questorylabs/ui";
import { formatShare } from "@/lib/music";
import { initialOf } from "../../music.utils";
import type { TopsKind } from "../music.charts.constants";
import { entityHref } from "../music.charts.utils";

const HAS_ART = new Set<TopsKind>(["artists", "albums", "tracks"]);

export const ChartRows = ({
  kind,
  items,
  rankOffset,
  periodListens,
}: {
  kind: TopsKind;
  items: MusicTopItem[];
  rankOffset: number;
  periodListens: number;
}) => {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="m-0 list-none p-0">
      {items.map((item, i) => {
        const rank = rankOffset + i + 1;
        const href = entityHref(kind, item.id);
        const name = item.name || item.title || "—";
        const top = rank <= 3;
        const lead = rank === 1;
        return (
          <li
            key={item.id}
            className="q-row grid min-h-16 grid-cols-[32px_minmax(0,1fr)_56px] items-center gap-3.5 rounded-[14px] px-3 py-2 sm:grid-cols-[40px_46px_minmax(0,1fr)_minmax(80px,200px)_64px]"
            style={{ "--i": i } as CSSProperties}
          >
            <span
              className={cn(
                "font-extralight leading-none tracking-[-0.04em]",
                top ? "text-[30px] text-[var(--ink)]" : "text-xl text-[var(--faint)]",
              )}
            >
              {rank}
            </span>
            {HAS_ART.has(kind) ? (
              <span
                aria-hidden="true"
                className={cn(
                  "hidden h-11 w-11 place-items-center overflow-hidden border border-white/10 bg-[radial-gradient(circle,rgba(240,168,184,0.22),rgba(255,255,255,0.03))] font-serif text-lg text-[#f0c4cf] sm:grid",
                  kind === "artists" ? "rounded-full" : "rounded-xl",
                )}
              >
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  initialOf(name)
                )}
              </span>
            ) : (
              <span aria-hidden="true" className="hidden sm:block" />
            )}
            <span className="min-w-0">
              {href ? (
                <Link
                  href={href}
                  className="block truncate font-normal hover:text-[var(--music)]"
                >
                  {name}
                </Link>
              ) : (
                <span className="block truncate font-normal">{name}</span>
              )}
              {item.artistName ? (
                <span className="block truncate text-[13px] text-[var(--muted)]">
                  {item.artistName}
                </span>
              ) : null}
            </span>
            <span aria-hidden="true" className="hidden h-0.5 bg-white/[0.07] sm:block">
              <span
                className={cn(
                  "q-bar block h-0.5",
                  lead
                    ? "bg-[var(--music)] shadow-[0_0_10px_rgba(240,168,184,0.7)]"
                    : "bg-[#bdbdc2]",
                )}
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </span>
            <span className="text-right">
              <span className="block text-lg font-light">{item.count.toLocaleString()}</span>
              <span className="block font-mono text-[10px] text-[var(--faint)]">
                {formatShare(item.count, periodListens)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
