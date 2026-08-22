"use client";

import { useEffect, useRef } from "react";
import type { CurationJob, JobStatus } from "@/lib/enterprise-types";
import styles from "../recommendations.module.css";

const STAGES: { id: JobStatus; label: string }[] = [
  { id: "scoring", label: "Scoring" },
  { id: "extras", label: "Finding extras" },
  { id: "writing", label: "Writing" },
];

const STAGE_ORDER: Record<string, number> = {
  queued: 0,
  scoring: 1,
  extras: 2,
  writing: 3,
  done: 4,
  failed: 4,
};

/**
 * Wait experience: a short stage stepper plus a live activity feed.
 */
export const AgentProgress = ({
  job,
  onShowHeuristics,
}: {
  job: CurationJob;
  onShowHeuristics?: () => void;
}) => {
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = feedRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.events.length]);

  const position = STAGE_ORDER[job.status] ?? 0;

  return (
    <div className={styles.progress}>
      <ol className={styles.progressSteps}>
        {STAGES.map((stage, i) => {
          const idx = i + 1;
          const state =
            position > idx ? "done" : position === idx ? "active" : "pending";
          return (
            <li
              key={stage.id}
              className={styles.progressStep}
              data-state={state}
            >
              <span className={styles.progressDot} aria-hidden />
              {stage.label}
            </li>
          );
        })}
      </ol>

      <div ref={feedRef} className={styles.progressFeed} role="log">
        {job.events.length === 0 && (
          <p className={styles.progressLine}>Scoring your libraries…</p>
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
