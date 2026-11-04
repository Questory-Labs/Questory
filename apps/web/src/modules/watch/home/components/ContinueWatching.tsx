import Link from "next/link";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WatchContinueResponse } from "@questorylabs/shared";
import { Panel, ResourceStatus, SkeletonTileGrid, StateMessage } from "@/components/ui";
import { TickScrubber } from "@questorylabs/ui";
import { PosterThumb } from "@/modules/media/shelf/components/PosterThumb";
import { continueNextLabel } from "../watch.home.utils";

export const ContinueWatching = ({
  continuing,
}: {
  continuing: UseResourceResult<WatchContinueResponse>;
}) => {
  const items = continuing.value?.items ?? [];
  if (!continuing.failed && !continuing.empty && items.length === 0) return null;
  return (
    <section aria-labelledby="watch-continue" className="q-in [--i:1]">
      <h2
        id="watch-continue"
        className="mx-1 font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--muted)]"
      >
        Continue watching
      </h2>
      <ResourceStatus
        failed={continuing.failed}
        empty={continuing.empty}
        loading={<SkeletonTileGrid count={3} className="mt-2.5" />}
        error={<StateMessage variant="error">Could not load continue watching.</StateMessage>}
      >
        <ul className="mt-2.5 grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5 p-0">
          {items.map((c, i) => (
            <li key={c.title.id}>
              <Link href={`/watch/titles/${c.title.id}`} className="group block h-full">
                <Panel
                  wrapperClassName="h-full"
                  className={`q-lift flex h-full gap-4 p-3.5 ${i === 0 ? "bg-[linear-gradient(160deg,color-mix(in_srgb,var(--watch)_12%,transparent),rgba(255,255,255,0.016)_60%)]" : ""}`}
                >
                  <span className="aspect-[2/3] w-[72px] flex-none overflow-hidden rounded-xl border border-white/10">
                    <PosterThumb
                      url={c.title.posterUrl}
                      seed={c.title.id}
                      tint="color-mix(in srgb, var(--watch) 45%, transparent)"
                      className="transition-transform duration-700 group-hover:-rotate-[1.5deg] group-hover:scale-[1.06]"
                    />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--watch)]">
                      {c.anime ? "Anime" : "Show"}
                    </span>
                    <span className="mt-0.5 block truncate text-lg font-normal">{c.title.name}</span>
                    <span className="block text-[13px] text-[var(--muted)]">{continueNextLabel(c)}</span>
                    {c.progress != null ? (
                      <span className="mt-auto flex items-center gap-2.5 pt-3">
                        <TickScrubber
                          value={c.progress / 100}
                          label={`${c.title.name} progress`}
                          className="flex-1"
                        />
                        <span className="font-mono text-[11px] text-[var(--muted)]">{c.progress}%</span>
                      </span>
                    ) : null}
                  </span>
                </Panel>
              </Link>
            </li>
          ))}
        </ul>
      </ResourceStatus>
    </section>
  );
};
