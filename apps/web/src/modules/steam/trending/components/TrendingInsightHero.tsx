"use client";

import { Panel } from "@questorylabs/ui";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WeeklyDigest, WeeklyDigestView } from "@questorylabs/shared";

const hasCopy = (result: WeeklyDigest) =>
  Boolean(
    result.llmPolished &&
      (result.headline.trim() || result.body.trim() || result.items.length),
  );

const DigestKicker = () => (
  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
    Trending insight
  </p>
);

export const TrendingInsightHero = ({
  digest,
}: {
  digest: UseResourceResult<WeeklyDigestView>;
}) => {
  if (digest.failed) return null;

  const result = digest.value?.result;
  const generating =
    digest.busy || digest.value?.generating === true;
  const visible = result && hasCopy(result);

  if (!visible && !generating) return null;

  if (!visible) {
    return (
      <section className="px-1">
        <DigestKicker />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <h2 className="font-display text-xl font-bold tracking-tight">
            Reading the charts against what you&apos;ve been on
          </h2>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Writing a short take from public charts and your last month.
        </p>
      </section>
    );
  }

  return (
    <section>
      <Panel size="md" wrapperClassName="max-w-3xl" className="p-5">
        <DigestKicker />
        {result.headline.trim() ? (
          <h2 className="mt-2 font-display text-xl font-bold tracking-tight">
            {result.headline}
          </h2>
        ) : null}
        {result.body.trim() ? (
          <p className="mt-3 text-sm text-[var(--muted)]">{result.body}</p>
        ) : null}
        {result.items.length ? (
          <ul className="mt-4 space-y-2">
            {result.items.map((item) => (
              <li key={`${item.domain}-${item.name}`}>
                <Panel variant="outline" className="px-3 py-2">
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="font-mono text-[11px] text-[var(--faint)]">
                    {item.chartLabel}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{item.reason}</p>
                </Panel>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>
    </section>
  );
};
