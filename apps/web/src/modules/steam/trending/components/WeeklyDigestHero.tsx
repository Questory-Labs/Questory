"use client";

import { EmptyState, Panel, ResourceStatus, SkeletonTile } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WeeklyDigestView } from "@questorylabs/shared";

export const WeeklyDigestHero = ({
  digest,
}: {
  digest: UseResourceResult<WeeklyDigestView>;
}) => {
  const result = digest.value?.result;
  const generating = digest.value?.generating === true && !result;

  return (
    <section className="mb-10">
      <ResourceStatus
        failed={digest.failed}
        empty={digest.empty && !generating}
        loading={<SkeletonTile className="max-w-3xl" />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">
                Could not load weekly overlap.
              </span>
            }
          />
        }
      >
        <Panel size="lg" className="max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
            Last week vs the world
          </p>
          {result ? (
            <>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                {result.headline}
              </h2>
              <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                {result.from} – {result.to}
                {result.llmPolished ? "" : " · overlap from your libraries vs public charts"}
              </p>
              {result.body ? (
                <p className="mt-3 text-sm text-[var(--muted)]">{result.body}</p>
              ) : null}
              {result.items.length ? (
                <ul className="mt-4 space-y-2">
                  {result.items.map((item) => (
                    <li key={`${item.domain}-${item.name}`}>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="font-mono text-[11px] text-[var(--faint)]">
                        {item.domain} · {item.chartLabel}
                      </p>
                      <p className="text-xs text-[var(--muted)]">{item.reason}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">
                  No chart overlap for that week — charts still paint below.
                </p>
              )}
            </>
          ) : (
            <>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight">
                Weekly overlap
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {generating
                  ? "Building last week’s overlap with public charts. Shelves below are ready now."
                  : "Your previous ISO week compared with public charts. Heuristic overlap — a model is optional polish, not required."}
              </p>
            </>
          )}
        </Panel>
      </ResourceStatus>
    </section>
  );
};
