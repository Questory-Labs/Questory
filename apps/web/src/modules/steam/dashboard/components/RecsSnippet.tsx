"use client";

import Link from "next/link";
import {
  EmptyState,
  Panel,
  ResourceStatus,
  SkeletonTile,
} from "@questorylabs/ui";
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
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">
            For you
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {summary || "Heuristic picks from your libraries — not an AI digest."}
          </p>
        </div>
        <Link
          href="/recommendations"
          className="shrink-0 text-sm text-[var(--muted)] transition hover:text-[var(--accent)]"
        >
          Recommendations →
        </Link>
      </div>
      <ResourceStatus
        failed={recs.failed}
        empty={recs.empty}
        loading={<SkeletonTile className="max-w-xl" />}
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
        {items.length ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.itemKey ?? `${item.domain}-${item.name}`}>
                <Panel variant="outline" className="px-3 py-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
                    {item.domain}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium">{item.name}</p>
                  {item.reasons[0] ? (
                    <p className="mt-1 text-xs text-[var(--muted)]">{item.reasons[0]}</p>
                  ) : null}
                </Panel>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No picks yet." />
        )}
      </ResourceStatus>
    </section>
  );
};
