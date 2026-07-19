import type { ReactNode } from "react";
import { HatchShadow } from "@/components/HatchShadow";

export function EmptyState({
  title,
  description,
  className = "",
}: {
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return (
    <HatchShadow
      className={className}
      faceClassName="panel px-5 py-8 text-center"
    >
      <p className="text-[var(--muted)]">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-[var(--faint)]">{description}</p>
      ) : null}
    </HatchShadow>
  );
}
