"use client";

import type { CSSProperties } from "react";
import type { Goal } from "@questorylabs/shared";
import { GOAL_DOMAIN_COLOR, goalKindLabel } from "@/lib/goals";
import { formatHours } from "../enterprise.goals.utils";

export const GoalRow = ({
  goal,
  index,
  reason,
  busy,
  onToggle,
  onRemove,
}: {
  goal: Goal;
  index: number;
  reason?: string;
  busy: boolean;
  onToggle: (goal: Goal) => void;
  onRemove: (goal: Goal) => void;
}) => {
  const done = Boolean(goal.doneAt);
  const color = GOAL_DOMAIN_COLOR[goal.domain];
  return (
    <li
      className={`panel q-lift q-in flex flex-wrap items-center gap-x-[18px] gap-y-3 rounded-[22px] px-5 py-4 ${
        done ? "opacity-60" : ""
      }`}
      style={{ "--i": index + 2 } as CSSProperties}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={`Mark ${goal.name} ${done ? "not done" : "done"}`}
        disabled={busy}
        onClick={() => onToggle(goal)}
        className="grid size-[30px] flex-none place-items-center rounded-full border p-0 transition-[background-color,box-shadow] duration-500 disabled:opacity-60"
        style={{
          borderColor: color,
          background: done ? color : "transparent",
          boxShadow: done ? `0 0 14px ${color}` : "none",
        }}
      >
        <svg
          aria-hidden="true"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0b0b0c"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            pathLength={1}
            d="M5 12.5 10 17 19 7"
            strokeDasharray="1"
            strokeDashoffset={done ? 0 : 1}
            className="transition-[stroke-dashoffset] duration-500"
          />
        </svg>
      </button>
      <div className="min-w-0 flex-[1_1_280px]">
        <span
          className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.08em]"
          style={{ color }}
        >
          <span aria-hidden="true" className="size-[5px] rounded-full" style={{ background: color }} />
          {goalKindLabel(goal.kind)}
        </span>
        <h2
          className={`mt-1 text-lg font-normal tracking-[-0.01em] ${
            done ? "line-through decoration-white/35" : ""
          }`}
        >
          {goal.name}
        </h2>
        {reason ? <p className="mt-0.5 text-sm text-[var(--muted)]">{reason}</p> : null}
      </div>
      {goal.estimatedMinutes != null && goal.estimatedMinutes > 0 ? (
        <span className="text-[26px] font-extralight tracking-[-0.03em]">
          ~{formatHours(goal.estimatedMinutes)}
        </span>
      ) : null}
      {done ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggle(goal)}
          className="min-h-9 rounded-full border border-white/[0.12] px-3.5 text-[13px] text-[var(--ink)] transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-60"
        >
          Undo
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onRemove(goal)}
          aria-label={`Remove ${goal.name}`}
          className="min-h-9 rounded-full border border-white/[0.12] px-3.5 text-[13px] text-[var(--ink)] transition-transform duration-500 hover:-translate-y-0.5"
        >
          Remove
        </button>
      )}
    </li>
  );
};
