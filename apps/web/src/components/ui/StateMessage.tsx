import type { ReactNode } from "react";
import { RotatingTagline } from "@/components/RotatingTagline";
import { HatchShadow } from "@/components/HatchShadow";

import { QMark } from "./QMark";

/* ------------------------------------------------------------------ */
/*  StateMessage                                                       */
/* ------------------------------------------------------------------ */

export function StateMessage({
  variant,
  children,
  className = "",
}: {
  variant: "loading" | "error";
  /** Optional fixed text; loading messages default to a rotating quote. */
  children?: ReactNode;
  className?: string;
}) {
  const isError = variant === "error";

  const content =
    children ??
    (variant === "loading" ? (
      <RotatingTagline context="loading" variant="compact" />
    ) : null);

  return (
    <HatchShadow
      size="sm"
      className={`mt-8 ${className}`.trim()}
      faceClassName="panel px-5 py-6 text-center"
    >
      <div className="mb-3 flex justify-center">
        <QMark variant={variant} />
      </div>

      <p
        className={`text-xs font-semibold uppercase tracking-wider ${isError ? "text-[var(--danger)]" : "text-[var(--muted)]"
          }`}
      >
        {isError ? "Error" : "Loading"}
      </p>

      {content ? (
        <p className="mt-2 text-sm text-[var(--faint)]">{content}</p>
      ) : null}
    </HatchShadow>
  );
}
