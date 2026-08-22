"use client";

import type { ReactNode } from "react";
import {
  Panel,
  ResourceStatus,
  SkeletonChart,
  StateMessage,
} from "@/components/ui";

export const ChartStatus = ({
  failed,
  empty,
  title,
  error,
  children,
}: {
  failed: boolean;
  empty: boolean;
  title: string;
  error: string;
  children: ReactNode;
}) => (
  <ResourceStatus
    failed={failed}
    empty={empty}
    loading={
      <Panel className="p-4">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--faint)]">
          {title}
        </h2>
        <SkeletonChart className="mt-3" />
      </Panel>
    }
    error={<StateMessage variant="error">{error}</StateMessage>}
  >
    {children}
  </ResourceStatus>
);
