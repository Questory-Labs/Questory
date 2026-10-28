"use client";

import { useEffect, useRef } from "react";
import type { CurationJob, JobStage } from "@/lib/enterprise-types";

const stepState = (
  stages: JobStage[],
  status: CurationJob["status"],
  index: number,
): "done" | "active" | "pending" => {
  if (status === "done" || status === "failed") return "done";
  if (status === "queued") return "pending";
  const current = stages.findIndex((stage) => stage.id === status);
  if (current < 0) return "pending";
  if (index < current) return "done";
  if (index === current) return "active";
  return "pending";
};

const emptyHint = (job: CurationJob): string => {
  const stages = job.stages ?? [];
  const current = stages.find((stage) => stage.id === job.status);
  return current?.hint || stages[0]?.hint || "";
};

/**
 * Wait experience: a short stage stepper plus a live activity feed.
 * Stage labels come from the job payload.
 */
export const AgentProgress = ({
  job,
  onShowHeuristics,
}: {
  job: CurationJob;
  onShowHeuristics?: () => void;
}) => {
  const feedRef = useRef<HTMLDivElement>(null);
  const stages = job.stages ?? [];
  const hint = emptyHint(job);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.events.length]);

  return (
    <div className="panel-accent q-in flex flex-col gap-4 p-5">
      {stages.length > 0 && (
        <ol className="flex flex-wrap gap-x-5 gap-y-2">
          {stages.map((stage, i) => {
            const state = stepState(stages, job.status, i);
            return (
              <li
                key={stage.id}
                className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] ${
                  state === "pending" ? "text-[var(--faint)]" : "text-[var(--warm)]"
                }`}
                data-state={state}
              >
                <span
                  aria-hidden
                  className={`size-[6px] rounded-full ${
                    state === "active"
                      ? "q-live bg-[var(--warm)]"
                      : state === "done"
                        ? "bg-[var(--warm)]"
                        : "bg-white/15"
                  }`}
                />
                {stage.label}
              </li>
            );
          })}
        </ol>
      )}

      <div
        ref={feedRef}
        className="max-h-44 space-y-1 overflow-y-auto rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 font-mono text-xs text-[var(--muted)]"
        role="log"
      >
        {job.events.length === 0 && hint && <p>{hint}</p>}
        {job.events.map((event, i) => (
          <p key={`${event.ts}-${i}`} className="q-in">
            {event.message}
          </p>
        ))}
      </div>

      {onShowHeuristics && (
        <button
          type="button"
          className="self-start text-[13px] text-[var(--muted)] underline-offset-4 hover:text-[var(--ink)] hover:underline"
          onClick={onShowHeuristics}
        >
          Show quick picks while I wait
        </button>
      )}
    </div>
  );
};
