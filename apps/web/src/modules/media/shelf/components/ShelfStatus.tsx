import type { ReactNode } from "react";
import { ResourceStatus, SkeletonChart, SkeletonListRows, StateMessage } from "@/components/ui";

export const ShelfStatus = ({
  res,
  error,
  rows,
  children,
}: {
  res: { failed: boolean; empty: boolean };
  error: string;
  rows?: boolean;
  children: ReactNode;
}) => (
  <ResourceStatus
    failed={res.failed}
    empty={res.empty}
    loading={rows ? <SkeletonListRows /> : <SkeletonChart />}
    error={<StateMessage variant="error">{error}</StateMessage>}
  >
    {children}
  </ResourceStatus>
);

export const ShelfEmpty = ({ children }: { children: ReactNode }) => (
  <p className="mt-4 text-sm text-[var(--muted)]">{children}</p>
);
