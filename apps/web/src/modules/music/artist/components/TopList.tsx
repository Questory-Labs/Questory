"use client";

import Link from "next/link";
import { MusicCover } from "@/components/music/MusicCover";
import { OverflowMarquee } from "@/components/ui";

export const TopList = ({
  title,
  empty,
  items,
  moreHref,
  moreLabel,
}: {
  title: string;
  empty: string;
  moreHref?: string;
  moreLabel?: string;
  items: Array<{
    key: string;
    href: string;
    label: string;
    sub?: string | null;
    count: number;
    imageUrl?: string | null;
  }>;
}) => (
  <section>
    <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
      {title}
    </h2>
    {items.length > 0 ? (
      <>
        <ol className="mt-3 space-y-2">
          {items.map((t, i) => (
            <li key={t.key}>
              <Link
                href={t.href}
                className="flex items-center gap-3 border-b border-[var(--line)] py-2 text-sm hover:bg-[var(--bg-1)]"
              >
                <span className="w-5 font-mono text-[var(--faint)]">
                  {i + 1}.
                </span>
                <MusicCover src={t.imageUrl} alt="" size="sm" />
                <OverflowMarquee className="flex-1 text-[var(--ink)]">
                  {t.label}
                  {t.sub ? (
                    <span className="text-[var(--muted)]"> · {t.sub}</span>
                  ) : null}
                </OverflowMarquee>
                <span className="font-mono text-[11px] text-[var(--faint)]">
                  {t.count}
                </span>
              </Link>
            </li>
          ))}
        </ol>

        {moreHref ? (
          <p className="mt-3 text-sm">
            <Link
              href={moreHref}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--accent)]"
            >
              {moreLabel ?? "View all"} →
            </Link>
          </p>
        ) : null}
      </>
    ) : (
      <p className="mt-3 text-sm text-[var(--muted)]">{empty}</p>
    )}
  </section>
);
