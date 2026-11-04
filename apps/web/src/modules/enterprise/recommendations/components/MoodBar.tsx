"use client";

import { useEffect, useId, useState } from "react";
import { peekCurateCache } from "@/lib/enterprise-api";
import type { CurateOptions } from "../enterprise.recommendations.types";
import { MOOD_CHIPS } from "../enterprise.recommendations.constants";

/**
 * Free-text mood input + quick chips. Submitting kicks off curation
 * (cache hit loads instantly; otherwise starts the curate job).
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
  const inputId = useId();
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
      className="panel-accent q-in flex flex-col gap-3.5 p-5 [--i:1]"
      onSubmit={(e) => {
        e.preventDefault();
        if (cacheAvailable) {
          onUseCached(moodOf(text));
        } else {
          onCurate(moodOf(text), { force: false });
        }
      }}
    >
      <label
        htmlFor={inputId}
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--warm)]"
      >
        <span aria-hidden="true" className="q-live size-[5px] rounded-full bg-[var(--warm)]" />
        How are you feeling?
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={inputId}
          className="min-h-[52px] flex-[1_1_320px] rounded-full border border-[rgba(230,194,122,0.22)] bg-black/35 px-5 font-serif text-xl text-[#f3efe6] outline-none placeholder:text-[var(--faint)] focus:border-[rgba(230,194,122,0.5)] disabled:opacity-60"
          type="text"
          value={text}
          placeholder="I have 45 minutes and want something cozy"
          onChange={(e) => setText(e.target.value)}
          disabled={busy}
          aria-label="Mood"
        />
        <button
          className="min-h-[52px] rounded-full bg-[linear-gradient(180deg,#f2dca8,#d9b066)] px-[26px] text-[15px] font-medium text-[#17140e] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_10px_30px_-12px_rgba(230,194,122,0.6)] transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-60"
          type="submit"
          disabled={busy}
          data-cache={cacheAvailable ? "true" : "false"}
        >
          {busy ? "Curating…" : "Curate"}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {MOOD_CHIPS.map((chip) => {
          const on = text.trim() === chip;
          return (
            <button
              key={chip}
              type="button"
              aria-pressed={on}
              className={`min-h-9 rounded-full border px-3.5 text-[13px] transition-[transform,background-color,border-color,color] duration-500 hover:-translate-y-0.5 hover:border-[rgba(230,194,122,0.5)] disabled:opacity-50 ${
                on
                  ? "border-[rgba(230,194,122,0.45)] bg-[rgba(230,194,122,0.16)] text-[#f3efe6]"
                  : "border-[rgba(230,194,122,0.2)] bg-transparent text-[#d9bf86]"
              }`}
              disabled={busy}
              onClick={() => setText(chip)}
            >
              {chip}
            </button>
          );
        })}
      </div>
    </form>
  );
};
