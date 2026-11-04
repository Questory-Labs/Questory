"use client";

import Link from "next/link";
import type { MusicTopsResponse } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { Panel, ResourceStatus, SkeletonListRows, StateMessage } from "@/components/ui";

export const TopArtistsCard = ({
  tops,
}: {
  tops: UseResourceResult<MusicTopsResponse>;
}) => {
  const items = tops.value?.items ?? [];
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Panel wrapperClassName="h-full" className="q-lift h-full px-3 pb-2.5 pt-[18px]">
      <section aria-labelledby="music-top-artists">
        <div className="mx-2 mb-2 flex justify-between">
          <h2 id="music-top-artists" className="text-[17px] font-normal">
            Top artists
          </h2>
          <Link
            href="/music/charts?kind=artists"
            className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)]"
          >
            Charts
          </Link>
        </div>
        <ResourceStatus
          failed={tops.failed}
          empty={tops.empty}
          loading={<SkeletonListRows />}
          error={<StateMessage variant="error">Could not load top artists.</StateMessage>}
        >
          {items.length === 0 ? (
            <p className="mx-2 py-2 text-sm text-[var(--muted)]">No listens in this range.</p>
          ) : (
            <ol className="m-0 list-none p-0">
              {items.map((a, i) => (
                <li key={a.id}>
                  <Link
                    href={`/music/artists/${a.id}`}
                    className="q-row block rounded-[14px] p-2"
                  >
                    <div className="flex items-baseline gap-2.5">
                      <span className="font-mono text-[10px] text-[var(--dim)]">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-normal">
                        {a.name ?? a.title}
                      </span>
                      <span className="text-lg font-extralight">{a.count.toLocaleString()}</span>
                    </div>
                    <div className="ml-[22px] mt-1.5 h-0.5 bg-white/[0.06]">
                      <div
                        className={`q-bar h-full ${i === 0 ? "bg-[var(--music)]" : "bg-[#bdbdc2]"}`}
                        style={{ width: `${(a.count / max) * 100}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </ResourceStatus>
      </section>
    </Panel>
  );
};
