"use client";

import {
  formatTaglineCompact,
  type TaglineContext,
} from "@/lib/status-taglines";
import { useRotatingTagline } from "@/hooks/useRotatingTagline";

/**
 * Iconic gaming/movie quote for a status context.
 *
 * - `full`: stacked quote lines + attribution, for LoadingPage/StatusPage.
 * - `compact`: single “quote” — Source line, for inline loaders.
 *
 * Rotates while mounted by default (loading states); pass `rotate={false}`
 * for one stable pick (404/500 pages).
 */
export function RotatingTagline({
  context,
  variant = "full",
  rotate = true,
  className = "",
}: {
  context: TaglineContext;
  variant?: "full" | "compact";
  rotate?: boolean;
  className?: string;
}) {
  const tagline = useRotatingTagline(context, { rotate });

  if (variant === "compact") {
    return (
      <span aria-live={rotate ? "polite" : undefined} className={className}>
        {tagline ? formatTaglineCompact(tagline) : "Loading…"}
      </span>
    );
  }

  return (
    <div
      aria-live={rotate ? "polite" : undefined}
      // min-height for two quote lines + attribution so rotation never shifts layout
      className={`min-h-[4.5rem] motion-safe:transition-opacity motion-safe:duration-300 ${className}`.trim()}
    >
      {tagline ? (
        <>
          <blockquote className="text-[var(--muted)]">
            {tagline.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </blockquote>
          <p className="mt-1 text-sm text-[var(--faint)]">— {tagline.source}</p>
        </>
      ) : null}
    </div>
  );
}
