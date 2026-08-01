import type { ReactNode } from "react";
import { RotatingTagline } from "@/components/RotatingTagline";

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
  const color =
    variant === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]";

  const content =
    children ??
    (variant === "loading" ? (
      <RotatingTagline context="loading" variant="compact" />
    ) : null);

  return (
    <p className={`mt-8 text-sm ${color} ${className}`.trim()}>{content}</p>
  );
}
