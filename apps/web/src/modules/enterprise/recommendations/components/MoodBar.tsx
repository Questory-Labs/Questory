"use client";

import { useEffect, useState } from "react";
import { peekCurateCache } from "@/lib/enterprise-api";
import type { CurateOptions } from "../enterprise.recommendations.types";
import styles from "../recommendations.module.css";

const CHIPS = [
  "Cozy evening",
  "45 minutes",
  "Something new",
  "Surprise me",
];

/**
 * Free-text mood input + quick chips. Submitting kicks off curation
 * (cache hit loads instantly; otherwise starts the agentic job).
 */
export const MoodBar = ({
  busy,
  onCurate,
  onUseCached,
}: {
  busy: boolean;
  onCurate: (mood: string | undefined, options: CurateOptions) => void;
  onUseCached: (mood: string | undefined) => void;
}) => {
  const [text, setText] = useState("");
  const [cacheAvailable, setCacheAvailable] = useState(false);

  useEffect(() => {
    if (busy) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      const trimmed = text.trim();
      void peekCurateCache({
        limit: 12,
        mood: trimmed.length > 0 ? trimmed : undefined,
      })
        .then((view) => {
          if (!cancelled) setCacheAvailable(view.cached);
        })
        .catch(() => {
          if (!cancelled) setCacheAvailable(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [text, busy]);

  const moodOf = (raw: string) => {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  return (
    <form
      className={styles.moodBar}
      onSubmit={(e) => {
        e.preventDefault();
        if (cacheAvailable) {
          onUseCached(moodOf(text));
        } else {
          onCurate(moodOf(text), { force: false });
        }
      }}
    >
      <div className={styles.moodRow}>
        <input
          className={styles.moodInput}
          type="text"
          value={text}
          placeholder="How are you feeling? e.g. “I have 45 minutes and want something cozy”"
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          aria-label="Mood"
        />
        <button
          className={styles.moodSubmit}
          type="submit"
          disabled={busy}
          data-cache={cacheAvailable ? "true" : "false"}
        >
          {busy ? "Curating…" : "Curate"}
        </button>
      </div>
      <div className={styles.moodChips}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={styles.moodChip}
            disabled={busy}
            onClick={() => setText(chip)}
          >
            {chip}
          </button>
        ))}
      </div>
    </form>
  );
}
