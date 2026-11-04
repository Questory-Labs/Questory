import Link from "next/link";
import type { ReadLibraryItem } from "@questorylabs/shared";
import { PosterThumb } from "@/modules/media/shelf/components/PosterThumb";
import { progressFraction } from "@/modules/media/shelf/shelf.utils";
import { readStatusColor, readStatusLabel } from "../read.library.constants";
import { libraryItemMeta } from "../read.library.utils";

export const LibraryCard = ({ item, index }: { item: ReadLibraryItem; index: number }) => {
  const color = readStatusColor(item.listStatus);
  const fraction =
    item.listStatus === "completed" ? 1 : progressFraction(item.progressChapters, item.title.chapters) ?? 0;
  return (
    <li className="q-in" style={{ ["--i" as string]: Math.min(index, 12) }}>
      <Link
        href={`/read/titles/${item.title.id}`}
        className="q-lift flex gap-3.5 rounded-[20px] border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] p-3 no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      >
        <span className="relative aspect-[2/3] w-[58px] flex-none overflow-hidden rounded-[10px] border border-white/[0.06] bg-[#101012]">
          <PosterThumb url={item.title.coverUrl} seed={item.title.id} tint="var(--read)" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-base font-normal text-[var(--ink)]">{item.title.name}</span>
            <span
              className="inline-flex flex-none items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-[11px]"
              style={{ color }}
            >
              <span aria-hidden="true" className="h-[5px] w-[5px] rounded-full" style={{ background: color }} />
              {readStatusLabel(item.listStatus)}
            </span>
          </span>
          <span className="mt-0.5 block font-mono text-[10px] text-[var(--muted)]">{libraryItemMeta(item)}</span>
          <span aria-hidden="true" className="mt-2.5 block h-0.5 rounded-sm bg-white/[0.07]">
            <span
              className="q-bar block h-full rounded-sm"
              style={{ width: `${Math.round(fraction * 100)}%`, background: color }}
            />
          </span>
        </span>
      </Link>
    </li>
  );
};
