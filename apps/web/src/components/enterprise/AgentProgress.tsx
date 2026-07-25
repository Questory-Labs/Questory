"use client";

import { useEffect, useRef } from "react";
import type { CurationJob, JobStatus } from "@/lib/enterprise-types";
import styles from "./recommendations.module.css";

const STAGES: { id: JobStatus; label: string }[] = [
  { id: "scouting", label: "Scouting" },
  { id: "ranking", label: "Ranking" },
  { id: "validating", label: "Validating" },
  { id: "composing", label: "Composing" },
];

const STAGE_ORDER: Record<string, number> = {
  queued: 0,
  scouting: 1,
  ranking: 2,
  validating: 3,
  composing: 4,
  done: 5,
  failed: 5,
};

/**
 * The wait experience: a stage stepper plus the job's live activity feed
 * (tool calls, web searches, validator verdicts) polled by the parent.
 */
export function AgentProgress({
  job,
  onShowHeuristics,
}: {
  job: CurationJob;
  onShowHeuristics?: () => void;
}) {
  const feedRef = useRef<HTMLDivElement>(null);

  // Keep the newest activity line in view.
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
          <p className={styles.progressLine}>Waking the curators…</p>
        )}
        {job.events.map((event, i) => (
          <p key={`${event.ts}-${i}`} className={styles.progressLine}>
            <span className={styles.progressStage}>{event.stage}</span>
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
}
