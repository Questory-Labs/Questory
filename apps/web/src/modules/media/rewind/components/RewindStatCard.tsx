"use client";

import { Panel } from "@questorylabs/ui";

export const RewindStatCard = ({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) => (
  <Panel className="p-5 flex flex-col justify-center h-full">
    <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-2">
      {title}
    </h3>
    <div className="text-3xl font-semibold text-[var(--ink)]">{value}</div>
    {subtitle && (
      <p className="text-xs text-[var(--faint)] mt-2">{subtitle}</p>
    )}
  </Panel>
);
