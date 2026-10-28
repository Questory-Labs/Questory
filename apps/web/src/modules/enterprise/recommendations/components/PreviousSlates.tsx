"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { fetchRecommendationHistory } from "@/lib/enterprise-api";
import type {
  FeedbackAction,
  RecommendationHistorySlate,
} from "@/lib/enterprise-types";
import type { FeedbackTarget } from "../enterprise.recommendations.types";

export const HISTORY_RESOURCE_ID = ["enterprise-rec-history"] as const;

const servedLabel = (servedAt: number): string =>
  new Date(servedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export const PreviousSlates = ({
  currentKeys,
  votes,
  onFeedback,
}: {
  currentKeys: Set<string>;
  votes: Record<string, FeedbackAction>;
  onFeedback: (item: FeedbackTarget, action: FeedbackAction) => void;
}) => {
  const history = useResource({
    id: [...HISTORY_RESOURCE_ID],
    load: () => fetchRecommendationHistory(4),
    freshFor: 60_000,
    retries: 1,
  });

  const slates = (history.value?.slates ?? [])
    .filter((slate) => slate.source !== "recommend")
    .filter(
      (slate) => !slate.items.every((item) => currentKeys.has(item.itemKey)),
    )
    .slice(0, 3);
  if (slates.length === 0) return null;

  return (
    <section className="q-in flex flex-col gap-3" aria-label="Previously suggested">
      <h2 className="label-mono text-[11px] text-[var(--faint)]">Previously suggested</h2>
      <div className="flex flex-col gap-2.5">
        {slates.map((slate) => (
          <SlateRow
            key={slate.slateId}
            slate={slate}
            votes={votes}
            onFeedback={onFeedback}
          />
        ))}
      </div>
    </section>
  );
};

const voteClass = (on: boolean) =>
  on
    ? "border-[var(--line-strong)] bg-white/[0.08] text-[var(--ink)]"
    : "border-transparent text-[var(--faint)] hover:text-[var(--ink)]";

const SlateRow = ({
  slate,
  votes,
  onFeedback,
}: {
  slate: RecommendationHistorySlate;
  votes: Record<string, FeedbackAction>;
  onFeedback: (item: FeedbackTarget, action: FeedbackAction) => void;
}) => (
  <div className="rounded-[20px] border border-white/[0.06] bg-black/20 p-4">
    <p className="font-mono text-[11px] text-[var(--faint)]">
      {servedLabel(slate.servedAt)}
      {slate.ask ? ` · “${slate.ask}”` : ""}
    </p>
    <ul className="mt-2 divide-y divide-white/[0.05]">
      {slate.items.map((item) => {
        const vote = votes[item.itemKey] ?? item.feedback ?? undefined;
        return (
          <li
            key={item.itemKey}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm"
          >
            <span className="text-[var(--ink)]">{item.name}</span>
            {item.why ? (
              <span className="min-w-0 flex-1 text-xs text-[var(--muted)]">
                {item.why}
              </span>
            ) : null}
            <span className="ml-auto flex gap-1">
              <button
                type="button"
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${voteClass(vote === "like")}`}
                data-active={vote === "like"}
                aria-label={`Like ${item.name}`}
                title="More like this"
                onClick={() => onFeedback({ itemKey: item.itemKey }, "like")}
              >
                More
              </button>
              <button
                type="button"
                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${voteClass(vote === "dislike")}`}
                data-active={vote === "dislike"}
                aria-label={`Dislike ${item.name}`}
                title="Less like this"
                onClick={() => onFeedback({ itemKey: item.itemKey }, "dislike")}
              >
                Less
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  </div>
);
