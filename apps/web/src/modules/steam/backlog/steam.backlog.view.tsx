"use client";

import Link from "next/link";
import type { BacklogSummary } from "@questorylabs/shared";
import { EmptyState, ResourceStatus, SkeletonStatGrid } from "@questorylabs/ui";
import { CoverArt } from "../library/components/CoverArt";
import { LIBRARY_STATUS_LABELS } from "../library/steam.library.constants";
import type { BacklogViewProps } from "./steam.backlog.types";

const tile = "rounded-[18px] border border-white/[0.06] bg-black/25 px-4 py-3.5";
const tileValue =
  "mt-2 text-[34px] font-extralight leading-none tracking-[-0.03em]";

const AVG_SOURCE_LABEL: Record<BacklogSummary["avgSource"], string> = {
  snapshots: "from the last 8 weeks of play",
  steam2weeks: "from Steam's last two weeks",
  none: "no recent play recorded",
};

const STATUS_ORDER = [
  "playing",
  "backlog",
  "shelved",
  "finished",
  "dropped",
] as const;

const fmtHours = (h: number) => (h >= 10 ? Math.round(h) : h.toFixed(1));

export const BacklogView = (props: Record<string, unknown>) => {
  const { summary } = props as BacklogViewProps;
  const s = summary.value;
  const queued = s ? s.counts.backlog + s.counts.playing : 0;

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4">
      <header className="q-in flex flex-wrap items-end justify-between gap-4 px-1 pb-1 pt-2">
        <div>
          <p className="label-mono text-[var(--faint)]">
            <Link href="/library" className="hover:text-[var(--ink)]">
              Library
            </Link>{" "}
            · Backlog
          </p>
          <h1 className="font-display mt-1.5 text-[clamp(34px,4vw,52px)] font-light leading-none tracking-[-0.035em]">
            {s ? `${queued} games queued` : "Backlog"}
            {s && s.weeksToClear != null ? (
              <>
                ,{" "}
                <em className="font-serif font-normal text-[var(--muted)]">
                  about {fmtHours(s.weeksToClear)} weeks at your pace
                </em>
              </>
            ) : null}
          </h1>
        </div>
      </header>

      <ResourceStatus
        failed={summary.failed}
        empty={false}
        loading={<SkeletonStatGrid count={4} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load your backlog.
              </span>
            }
          />
        }
      >
        {s ? (
          <>
            <dl
              className="q-in grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3"
              style={{ ["--i" as string]: 1 }}
            >
              <div className={tile}>
                <dt className="label-mono text-[var(--faint)]">Main story left</dt>
                <dd className={tileValue}>
                  {fmtHours(s.remainingHours)}
                  <span className="text-xs tracking-normal text-[var(--faint)]"> h</span>
                </dd>
                <dd className="mt-1.5 text-xs text-[var(--muted)]">
                  {fmtHours(s.backlogHours.main)} h total · {fmtHours(s.backlogHours.extra)} h with extras
                </dd>
              </div>
              <div className={tile}>
                <dt className="label-mono text-[var(--faint)]">Weekly pace</dt>
                <dd className={tileValue}>
                  {fmtHours(s.avgWeeklyHours)}
                  <span className="text-xs tracking-normal text-[var(--faint)]"> h</span>
                </dd>
                <dd className="mt-1.5 text-xs text-[var(--muted)]">
                  {AVG_SOURCE_LABEL[s.avgSource]}
                </dd>
              </div>
              <div className={tile}>
                <dt className="label-mono text-[var(--faint)]">Weeks to clear</dt>
                <dd className={tileValue}>
                  {s.weeksToClear != null ? fmtHours(s.weeksToClear) : "—"}
                </dd>
                <dd className="mt-1.5 text-xs text-[var(--muted)]">
                  {s.weeksToClear != null
                    ? "at your current pace"
                    : "play something to get an estimate"}
                </dd>
              </div>
              <div className={tile}>
                <dt className="label-mono text-[var(--faint)]">No estimate</dt>
                <dd className={tileValue}>{s.backlogHours.unknownCount}</dd>
                <dd className="mt-1.5 text-xs text-[var(--muted)]">
                  games without HowLongToBeat data
                </dd>
              </div>
            </dl>

            <section
              aria-labelledby="backlog-next-up"
              className="q-in flex flex-col gap-3"
              style={{ ["--i" as string]: 2 }}
            >
              <h2 id="backlog-next-up" className="label-mono text-[var(--faint)]">
                Next up
              </h2>
              {s.nextUp.length ? (
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
                  {s.nextUp.map((g, i) => (
                    <li key={g.gameId}>
                      <Link
                        href={`/library/${g.gameId}`}
                        className="panel q-lift q-in group flex flex-col overflow-hidden"
                        style={{ ["--i" as string]: Math.min(i + 3, 20) }}
                      >
                        <div className="relative aspect-[460/215] overflow-hidden border-b border-white/[0.06] bg-[var(--bg-1)]">
                          <CoverArt
                            src={g.headerImage}
                            seed={g.gameId}
                            className="absolute inset-0 transition-[transform,filter] duration-[1200ms] ease-[var(--ease-out)] group-hover:scale-[1.07] group-hover:brightness-125"
                          />
                        </div>
                        <div className="px-3.5 pb-3.5 pt-3">
                          <h3 className="truncate text-[15px] font-normal">{g.name}</h3>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            {g.hltbMainHours != null
                              ? `${fmtHours(g.hltbMainHours)} h main story`
                              : "No estimate"}
                            {g.reviewScore != null ? ` · ${g.reviewScore}% positive` : ""}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  title="Nothing marked as backlog yet."
                  description="Set a game's status to Backlog from its library page and it will show up here."
                />
              )}
            </section>

            <section
              aria-labelledby="backlog-breakdown"
              className="q-in flex flex-col gap-3"
              style={{ ["--i" as string]: 3 }}
            >
              <h2 id="backlog-breakdown" className="label-mono text-[var(--faint)]">
                By status
              </h2>
              <ul className="flex flex-wrap gap-2">
                {STATUS_ORDER.map((k) => (
                  <li
                    key={k}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-4 text-[13px] text-[var(--muted)]"
                  >
                    <span className="text-[17px] font-light text-[var(--ink)]">
                      {s.counts[k]}
                    </span>
                    {LIBRARY_STATUS_LABELS[k]}
                  </li>
                ))}
                <li className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/[0.06] bg-black/20 px-4 text-[13px] text-[var(--muted)]">
                  <span className="text-[17px] font-light text-[var(--ink)]">
                    {s.counts.unset}
                  </span>
                  Unsorted
                </li>
              </ul>
            </section>
          </>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
