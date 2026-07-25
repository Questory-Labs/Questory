"use client";

import { useState } from "react";
import styles from "./recommendations.module.css";

const CHIPS = [
  "Cozy evening",
  "45 minutes",
  "Something new",
  "Surprise me",
];

/**
 * Free-text mood input + quick chips. Submitting kicks off an agentic
 * curation job with `context.mood`.
 */
export function MoodBar({
  busy,
  onCurate,
}: {
  busy: boolean;
  onCurate: (mood: string | undefined) => void;
}) {
  const [text, setText] = useState("");

  const submit = (mood: string) => {
    const trimmed = mood.trim();
    onCurate(trimmed.length > 0 ? trimmed : undefined);
  };

  return (
    <form
      className={styles.moodBar}
      onSubmit={(e) => {
        e.preventDefault();
        submit(text);
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
        <button className={styles.moodSubmit} type="submit" disabled={busy}>
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
            onClick={() => {
              setText(chip);
              submit(chip);
            }}
          >
            {chip}
          </button>
        ))}
      </div>
    </form>
  );
}
