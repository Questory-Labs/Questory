"use client";

import { ProgressRing } from "@questorylabs/ui";
import type { Goal, GoalTimeframe } from "@questorylabs/shared";
import {
  fitsInPeriod,
  formatHours,
  periodEdgeLabels,
  periodElapsed,
  periodTitle,
  remainingMinutes,
  type GoalPeriod,
} from "../enterprise.goals.utils";

const Summary = ({
  goals,
  period,
  now,
  weeklyHours,
}: {
  goals: Goal[];
  period: GoalPeriod;
  now: Date;
  weeklyHours: number | null;
}) => {
  if (goals.length === 0) {
    return <>Accept a suggestion below to start your list.</>;
  }
  const open = goals.filter((goal) => !goal.doneAt);
  if (open.length === 0) return <>Everything on the list is done.</>;
  const left = remainingMinutes(goals);
  const leftText =
    left > 0 ? (
      <>
        About <span className="text-[var(--ink)]">{formatHours(left)}</span> left across{" "}
        {open.length} {open.length === 1 ? "goal" : "goals"}.
      </>
    ) : (
      <>
        {open.length} {open.length === 1 ? "goal" : "goals"} left.
      </>
    );
  if (weeklyHours == null) return leftText;
  const fits = fitsInPeriod(left, weeklyHours, period, now);
  return (
    <>
      {leftText} You average{" "}
      <span className="text-[var(--ink)]">{formatHours(weeklyHours * 60)}</span> a week
      {left > 0 ? (fits ? ", so this fits with room to spare." : ", so this will be tight.") : "."}
    </>
  );
};

export const GoalsProgress = ({
  timeframe,
  goals,
  period,
  now,
  weeklyHours,
}: {
  timeframe: GoalTimeframe;
  goals: Goal[];
  period: GoalPeriod;
  now: Date;
  weeklyHours: number | null;
}) => {
  const done = goals.filter((goal) => goal.doneAt).length;
  const total = goals.length;
  const elapsed = periodElapsed(period, now);
  const [from, to] = periodEdgeLabels(period);
  const title = periodTitle(timeframe, period);
  return (
    <section
      aria-label={`${title} progress`}
      className="panel q-in flex flex-wrap items-center gap-7 px-7 py-6 [--i:1]"
    >
      <ProgressRing
        value={total > 0 ? done / total : 0}
        size={128}
        stroke={5}
        color="var(--accent)"
        label={`${done} of ${total} goals done`}
      />
      <div className="flex-[1_1_200px]">
        <p className="label-mono text-[10px] text-[var(--faint)]">{title} progress</p>
        <p className="mt-1.5 text-[72px] font-extralight leading-[0.95] tracking-[-0.05em]">
          {done}
          <span className="text-[26px] tracking-normal text-[var(--dim)]"> of {total}</span>
        </p>
      </div>
      <div className="flex-[2_1_360px]">
        <div className="relative h-[46px] overflow-hidden rounded-2xl border border-white/[0.05] bg-black/30">
          <span className="absolute left-3 top-1.5 font-mono text-[9px] text-[var(--faint)]">
            {from}
          </span>
          <span className="absolute right-3 top-1.5 font-mono text-[9px] text-[var(--faint)]">
            {to}
          </span>
          <span aria-hidden="true" className="tick-track absolute inset-x-3.5 bottom-[9px] h-3" />
          <span
            aria-hidden="true"
            className="tick-fill absolute bottom-[9px] left-3.5 h-3"
            style={{ width: `calc((100% - 28px) * ${elapsed.toFixed(3)})` }}
          />
          <span
            aria-hidden="true"
            className="absolute bottom-1.5 -ml-[9px] size-[18px] rounded-full bg-[var(--ink)] shadow-[0_0_12px_rgba(255,255,255,0.5)] transition-[left] duration-1000"
            style={{ left: `calc(14px + (100% - 28px) * ${elapsed.toFixed(3)})` }}
          />
        </div>
        <p className="mt-2.5 text-sm text-[#a1a1a6]">
          <Summary goals={goals} period={period} now={now} weeklyHours={weeklyHours} />
        </p>
      </div>
    </section>
  );
};
