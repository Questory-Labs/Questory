"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { EmptyState, ResourceStatus, SkeletonTile } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { RecommendationResponse } from "@/lib/enterprise-types";

export const RecsSnippet = ({
  recs,
}: {
  recs: UseResourceResult<RecommendationResponse>;
}) => {
  const items = recs.value?.items ?? [];
  const summary = recs.value?.worldSummary;

  return (
    <section
      aria-labelledby="dashboard-qengine"
      className="panel q-lift q-in flex min-w-0 flex-[1.4_1_440px] gap-[18px] !border-[var(--qengine-line)] p-5 [background-image:linear-gradient(180deg,rgba(230,194,122,0.07),rgba(255,255,255,0.012))]"
      style={{ "--i": 8 } as CSSProperties}
    >
      <span
        aria-hidden="true"
        className="dot-matrix q-twinkle hidden size-[150px] flex-none rounded-[18px] bg-black/35 opacity-50 [mask-image:radial-gradient(closest-side,#000,transparent)] sm:block"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <p
          id="dashboard-qengine"
          className="m-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--warm)]"
        >
          <span aria-hidden="true" className="q-live size-[5px] rounded-full bg-[var(--warm)]" />
          QEngine · for you
        </p>
        <ResourceStatus
          failed={recs.failed}
          empty={recs.empty}
          loading={<SkeletonTile className="mt-3 max-w-xl" />}
          error={
            <EmptyState
              title={
                <span className="text-[var(--danger)]">
                  Could not load recommendations.
                </span>
              }
            />
          }
        >
          <>
            <p className="mt-2.5 font-serif text-[26px] leading-[1.2] text-[#f3efe6]">
              {summary || "Heuristic picks from your libraries — not an AI digest."}
            </p>
            {items.length ? (
              <ul className="mt-3 flex list-none flex-wrap gap-2 p-0">
                {items.map((item) => (
                  <li
                    key={item.itemKey ?? `${item.domain}-${item.name}`}
                    className="pill max-w-full"
                    title={item.why ?? item.reasons[0]}
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--faint)]">
                      {item.domain}
                    </span>
                    <span className="truncate text-[var(--ink)]">{item.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">No picks yet.</p>
            )}
          </>
        </ResourceStatus>
        <p className="mt-auto pt-3 text-xs text-[var(--muted)]">
          <Link href="/recommendations" className="text-[var(--ink)] hover:text-[var(--accent)]">
            See picks
          </Link>
        </p>
      </div>
    </section>
  );
};
