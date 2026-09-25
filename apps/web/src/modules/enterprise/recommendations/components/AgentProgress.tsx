"use client";

import { useEffect, useRef } from "react";
import type { CurationJob, JobStage } from "@/lib/enterprise-types";
import styles from "../recommendations.module.css";

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
    <div className={styles.progress}>
      {stages.length > 0 && (
        <ol className={styles.progressSteps}>
          {stages.map((stage, i) => (
            <li
              key={stage.id}
              className={styles.progressStep}
              data-state={stepState(stages, job.status, i)}
            >
              <span className={styles.progressDot} aria-hidden />
              {stage.label}
            </li>
          ))}
        </ol>
      )}

      <div ref={feedRef} className={styles.progressFeed} role="log">
        {job.events.length === 0 && hint && (
          <p className={styles.progressLine}>{hint}</p>
        )}
        {job.events.map((event, i) => (
          <p key={`${event.ts}-${i}`} className={styles.progressLine}>
            {event.message}
          </p>
        ))}
      </div>

      {onShowHeuristics && (
        <button
          type="button"
          className={styles.progressEscape}
          onClick={onShowHeuristics}
        >
          Show quick picks while I wait
        </button>
      )}
    </div>
  );
};
