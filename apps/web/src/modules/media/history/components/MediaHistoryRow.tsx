import Link from "next/link";
import type { ReactNode } from "react";
import { PosterThumb } from "@/modules/media/shelf/components/PosterThumb";

export const MediaHistoryRow = ({
  href,
  title,
  posterUrl,
  seed,
  tint,
  kind,
  meta,
  trailing,
  date,
}: {
  href: string;
  title: string;
  posterUrl: string | null;
  seed: string;
  tint?: string;
  kind?: string;
  meta: string;
  trailing?: ReactNode;
  date: string;
}) => (
  <li className="q-row flex min-h-[72px] items-center gap-4 rounded-[18px] px-3 py-2 hover:bg-white/[0.04]">
    <span className="aspect-[2/3] w-10 flex-none overflow-hidden rounded-lg border border-white/10">
      <PosterThumb url={posterUrl} seed={seed} tint={tint} />
    </span>
    <span className="min-w-0 flex-1">
      <Link href={href} className="block truncate font-normal text-[var(--ink)] no-underline hover:text-white">
        {title}
      </Link>
      <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        {kind ? (
          <span className="rounded-full border border-white/[0.08] px-2 py-px text-[11px]">{kind}</span>
        ) : null}
        {meta}
      </span>
    </span>
    {trailing}
    <span className="w-[100px] flex-none text-right font-mono text-[11px] text-[var(--dim)]">
      {date}
    </span>
  </li>
);
