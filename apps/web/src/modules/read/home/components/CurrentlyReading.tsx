import Link from "next/link";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { ReadLibraryPage } from "@questorylabs/shared";
import { ResourceStatus, SkeletonTileGrid, StateMessage } from "@/components/ui";
import { PosterThumb } from "@/modules/media/shelf/components/PosterThumb";
import { readingPercent, readingProgressLabel } from "../read.home.utils";

export const CurrentlyReading = ({ reading }: { reading: UseResourceResult<ReadLibraryPage> }) => {
  const items = reading.value?.items ?? [];
  if (!reading.failed && !reading.empty && items.length === 0) return null;
  return (
    <section aria-labelledby="read-current" className="q-in [--i:1]">
      <div className="flex items-baseline justify-between px-1">
        <h2 id="read-current" className="m-0 text-[17px] font-normal">
          Currently reading
        </h2>
        <Link href="/read/library" className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
          Library
        </Link>
      </div>
      <ResourceStatus
        failed={reading.failed}
        empty={reading.empty}
        loading={<SkeletonTileGrid count={6} className="mt-3" />}
        error={<StateMessage variant="error">Could not load currently reading.</StateMessage>}
      >
        <ul className="mt-3 grid list-none grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5 p-0">
          {items.map((item, i) => {
            const pct = readingPercent(item);
            return (
              <li key={item.id} className="q-in" style={{ ["--i" as string]: i + 1 }}>
                <Link
                  href={`/read/titles/${item.title.id}`}
                  className="q-lift block overflow-hidden rounded-[20px] border border-white/[0.07] bg-gradient-to-b from-white/[0.05] to-white/[0.016] no-underline"
                >
                  <span className="relative block aspect-[2/3] overflow-hidden bg-[#101012]">
                    <PosterThumb url={item.title.coverUrl} seed={item.title.id} tint="var(--read)" alt="" />
                    <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
                    <span className="absolute inset-x-3 bottom-3.5 font-serif text-xl leading-[1.05] text-[var(--ink)]">
                      {item.title.name}
                    </span>
                  </span>
                  <span className="block px-3 pb-3 pt-2.5">
                    <span className="flex items-baseline justify-between">
                      <span className="font-mono text-[10px] text-[var(--muted)]">{readingProgressLabel(item)}</span>
                      {pct != null ? (
                        <span className="text-lg font-extralight text-[var(--ink)]">
                          {pct}
                          <span className="text-[11px] text-[var(--faint)]">%</span>
                        </span>
                      ) : null}
                    </span>
                    <span aria-hidden="true" className="mt-1.5 block h-0.5 rounded-sm bg-white/[0.07]">
                      <span
                        className="q-bar block h-full rounded-sm bg-[var(--read)] shadow-[0_0_8px_rgba(174,185,242,0.6)]"
                        style={{ width: `${pct ?? 0}%` }}
                      />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </ResourceStatus>
    </section>
  );
};
