"use client";

import { useState } from "react";

type StarRatingProps = {
  value: number | null;
  onChange: (value: number | null) => void;
  max?: number;
};

function StarGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 2.6 14.6 8.4 21 9.1 16.2 13.3 17.6 19.6 12 16.5 6.4 19.6 7.8 13.3 3 9.1 9.4 8.4z"
      />
    </svg>
  );
}

export function StarRating({ value, onChange, max = 5 }: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1);
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;

  function select(next: number) {
    onChange(value === next ? null : next);
  }

  function fillPercent(star: number): number {
    if (shown == null) return 0;
    const half = star - 0.5;
    if (shown >= star) return 100;
    if (shown >= half) return 50;
    return 0;
  }

  return (
    <div className="flex flex-nowrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Rating"
        className="flex items-center"
        onMouseLeave={() => setHover(null)}
      >
        {stars.map((star) => {
          const half = star - 0.5;
          const fill = fillPercent(star);
          const preview = hover != null;
          return (
            <span
              key={star}
              className="relative inline-block h-5 w-5"
            >
              <StarGlyph className="absolute inset-0 text-[var(--faint)]" />
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill}%` }}
              >
                <StarGlyph
                  className={`h-5 w-5 text-[var(--accent)] ${
                    preview ? "opacity-80" : ""
                  }`}
                />
              </span>
              <button
                type="button"
                role="radio"
                aria-checked={value === half}
                aria-label={`${half} stars`}
                onClick={() => select(half)}
                onMouseEnter={() => setHover(half)}
                className="absolute inset-y-0 left-0 z-10 w-1/2 cursor-pointer"
              />
              <button
                type="button"
                role="radio"
                aria-checked={value === star}
                aria-label={`${star} stars`}
                onClick={() => select(star)}
                onMouseEnter={() => setHover(star)}
                className="absolute inset-y-0 right-0 z-10 w-1/2 cursor-pointer"
              />
            </span>
          );
        })}
      </div>
      <span className="flex w-[6.5rem] shrink-0 items-center justify-end gap-2">
        <span
          data-testid="star-rating-value"
          className="inline-block w-[3.25rem] text-right font-mono text-xs tabular-nums text-[var(--muted)]"
        >
          {shown == null ? "—" : shown}
          <span className="text-[var(--faint)]"> / {max}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          disabled={value == null}
          className={`text-xs text-[var(--muted)] hover:text-[var(--ink)] ${
            value == null ? "invisible" : ""
          }`}
        >
          Clear
        </button>
      </span>
    </div>
  );
}
