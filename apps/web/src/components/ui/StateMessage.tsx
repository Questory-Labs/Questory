import type { ReactNode } from "react";

export function StateMessage({
  variant,
  children,
  className = "",
}: {
  variant: "loading" | "error";
  children: ReactNode;
  className?: string;
}) {
  const color =
    variant === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]";

  return (
    <p className={`mt-8 text-sm ${color} ${className}`.trim()}>{children}</p>
  );
}
