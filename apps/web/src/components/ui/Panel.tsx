import type { ReactNode } from "react";
import { HatchShadow } from "@/components/HatchShadow";

export function Panel({
  elevated = false,
  className = "",
  faceClassName = "",
  children,
}: {
  elevated?: boolean;
  className?: string;
  faceClassName?: string;
  children: ReactNode;
}) {
  if (elevated) {
    return (
      <HatchShadow
        className={className}
        faceClassName={`panel ${faceClassName}`.trim()}
      >
        {children}
      </HatchShadow>
    );
  }

  return (
    <div className={`panel-outline ${className} ${faceClassName}`.trim()}>
      {children}
    </div>
  );
}
