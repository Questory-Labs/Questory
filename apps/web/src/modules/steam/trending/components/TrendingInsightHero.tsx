"use client";

import type { ReactNode } from "react";
import type { UseResourceResult } from "@questorylabs/qhttp/react";
import type { WeeklyDigest, WeeklyDigestView } from "@questorylabs/shared";

const hasCopy = (result: WeeklyDigest) =>
  Boolean(
    result.llmPolished &&
      (result.headline.trim() || result.body.trim() || result.items.length),
  );

const InsightShell = ({ children }: { children: ReactNode }) => (
  <section
    aria-label="Trending insight"
    className="panel-accent q-in relative flex flex-wrap items-center gap-5 overflow-hidden px-6 py-[22px] [--i:1]"
  >
    <span
      aria-hidden="true"
      className="q-twinkle pointer-events-none absolute -top-[60px] right-[120px] h-[220px] w-[340px] bg-[radial-gradient(circle,rgba(240,217,166,0.85)_0.8px,transparent_1.3px)] bg-[length:6px_6px] opacity-50 [mask-image:radial-gradient(closest-side,#000,transparent)]"
    />
    <div className="relative min-w-0 flex-[1_1_360px]">
      <p className="m-0 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-warm">
        <span aria-hidden="true" className="q-live size-[5px] rounded-full bg-warm" />
        Trending insight
      </p>
      {children}
    </div>
  </section>
);

export const TrendingInsightHero = ({
  digest,
}: {
  digest: UseResourceResult<WeeklyDigestView>;
}) => {
  if (digest.failed) return null;

  const result = digest.value?.result;
  const generating = digest.busy || digest.value?.generating === true;
  const visible = result && hasCopy(result);

  if (!visible && !generating) return null;

  if (!visible) {
    return (
      <InsightShell>
        <h2 className="mt-2 font-serif text-[30px] leading-[1.12] text-ink">
          Reading the charts against what you&apos;ve been on
        </h2>
        <p className="mt-2 text-muted">
          Writing a short take from public charts and your last month.
        </p>
      </InsightShell>
    );
  }

  return (
    <InsightShell>
      {result.headline.trim() ? (
        <h2 className="mt-2 font-serif text-[30px] leading-[1.12] text-ink">{result.headline}</h2>
      ) : null}
      {result.body.trim() ? <p className="mt-2 text-muted">{result.body}</p> : null}
      {result.items.length ? (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {result.items.map((item) => (
            <li
              key={`${item.domain}-${item.name}`}
              className="rounded-2xl border border-[var(--qengine-line)] bg-black/20 px-3.5 py-2.5"
            >
              <p className="text-sm font-normal text-ink">{item.name}</p>
              <p className="label-mono mt-0.5">{item.chartLabel}</p>
              <p className="mt-1 text-xs text-muted">{item.reason}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </InsightShell>
  );
};
