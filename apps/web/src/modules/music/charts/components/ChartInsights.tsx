"use client";

import Link from "next/link";
import type { MusicMoversResponse, MusicRange } from "@questorylabs/shared";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import { cn, ProgressRing } from "@questorylabs/ui";
import { Panel, ResourceStatus, SkeletonListRows, StateMessage } from "@/components/ui";
import { RANGE_PREVIOUS } from "../../music.utils";
import { CHART_KINDS, type TopsKind } from "../music.charts.constants";
import {
  concentrationSentence,
  entityHref,
  moverBadge,
} from "../music.charts.utils";

export const ChartInsights = ({
  movers,
  kind,
  range,
}: {
  movers: UseResourceResult<MusicMoversResponse>;
  kind: TopsKind;
  range: MusicRange;
}) => {
  const kindLabel = (CHART_KINDS.find((k) => k.value === kind)?.label ?? kind).toLowerCase();
  const data = movers.value;
  return (
    <aside className="flex min-w-0 flex-[1_1_280px] flex-col gap-3.5">
      <ResourceStatus
        failed={movers.failed}
        empty={movers.empty}
        loading={<SkeletonListRows count={3} />}
        error={<StateMessage variant="error">Could not load movers.</StateMessage>}
      >
        {data ? (
          <>
            <Panel wrapperClassName="q-in [--i:3]" className="q-lift p-5">
              <section aria-labelledby="music-concentration">
                <h2 id="music-concentration" className="text-[17px] font-normal">
                  Concentration
                </h2>
                <div className="mt-3.5 flex items-center gap-[18px]">
                  <ProgressRing
                    value={data.concentration.share / 100}
                    size={88}
                    stroke={2}
                    color="var(--music)"
                    label={`Top ${data.concentration.topN} share ${data.concentration.share}%`}
                  />
                  <p className="text-[52px] font-extralight leading-none tracking-[-0.04em]">
                    {Math.round(data.concentration.share)}
                    <span className="text-base tracking-normal text-[var(--muted)]">%</span>
                  </p>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  {concentrationSentence(data, kindLabel, range)}
                </p>
              </section>
            </Panel>
            <Panel wrapperClassName="q-in [--i:4]" className="q-lift px-3 pb-2.5 pt-[18px]">
              <section aria-labelledby="music-movers">
                <h2 id="music-movers" className="mx-2 mb-1.5 text-[17px] font-normal">
                  Biggest movers
                </h2>
                {data.movers.length === 0 ? (
                  <p className="mx-2 py-2 text-sm text-[var(--muted)]">
                    {RANGE_PREVIOUS[range] ? "No rank changes yet." : "Movers need a comparable period."}
                  </p>
                ) : (
                  <ul className="m-0 list-none p-0">
                    {data.movers.map((m) => {
                      const badge = moverBadge(m.isNew, m.delta);
                      const href = entityHref(kind, m.id);
                      return (
                        <li
                          key={m.id}
                          className="q-row flex min-h-[46px] items-center justify-between gap-3 rounded-[14px] px-2"
                        >
                          <span className="min-w-0 truncate">
                            {href ? (
                              <Link href={href} className="hover:text-[var(--music)]">
                                {m.name}
                              </Link>
                            ) : (
                              m.name
                            )}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-full border border-white/10 px-2.5 py-0.5 font-mono text-[11px]",
                              badge.up ? "text-[var(--ok)]" : "text-[var(--music)]",
                            )}
                          >
                            {badge.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </Panel>
          </>
        ) : null}
      </ResourceStatus>
    </aside>
  );
};
