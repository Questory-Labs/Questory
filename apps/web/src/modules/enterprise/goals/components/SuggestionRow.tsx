"use client";

import type { GoalSuggestion } from "@/lib/enterprise-types";
import { GOAL_DOMAIN_COLOR, goalKindLabel } from "@/lib/goals";
import { formatHours } from "../enterprise.goals.utils";

export const SuggestionRow = ({
  suggestion,
  busy,
  disabled,
  onAccept,
}: {
  suggestion: GoalSuggestion;
  busy: boolean;
  disabled: boolean;
  onAccept: (suggestion: GoalSuggestion) => void;
}) => {
  const color = GOAL_DOMAIN_COLOR[suggestion.domain];
  return (
    <li className="q-row flex flex-wrap items-center gap-x-[18px] gap-y-2 rounded-[22px] border border-dashed border-white/[0.09] px-5 py-4">
      <div className="min-w-0 flex-[1_1_280px]">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
          style={{ color }}
        >
          <span aria-hidden="true" className="size-[5px] rounded-full" style={{ background: color }} />
          {goalKindLabel(suggestion.kind)}
        </span>
        <h3 className="mt-1 text-lg font-normal tracking-[-0.01em]">{suggestion.name}</h3>
        <p className="mt-0.5 text-sm text-[var(--muted)]">{suggestion.reason}</p>
      </div>
      {suggestion.estimatedTimeMinutes != null && suggestion.estimatedTimeMinutes > 0 ? (
        <span className="text-[26px] font-extralight tracking-[-0.03em] text-[var(--muted)]">
          ~{formatHours(suggestion.estimatedTimeMinutes)}
        </span>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAccept(suggestion)}
        aria-label={`Accept ${suggestion.name}`}
        className="min-h-9 rounded-full border border-[var(--line-strong)] bg-white/[0.06] px-3.5 text-[13px] text-[var(--ink)] transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-60"
      >
        {busy ? "Adding…" : "Accept"}
      </button>
    </li>
  );
};
