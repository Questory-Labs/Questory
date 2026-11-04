import type { ReactNode } from "react";
import { Panel } from "@/components/ui";

export const DetailKpiStrip = ({
  items,
}: {
  items: Array<{ label: string; value: ReactNode; hint?: string }>;
}) =>
  items.length > 0 ? (
    <dl className="q-in m-0 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3.5 [--i:2]">
      {items.map((k) => (
        <Panel
          key={k.label}
          size="sm"
          wrapperClassName="h-full"
          className="q-lift h-full px-[18px] py-4"
        >
          <dt className="font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--faint)]">
            {k.label}
          </dt>
          <dd className="mt-2 truncate text-[34px] font-extralight leading-none tracking-[-0.03em]">
            {k.value}
          </dd>
          {k.hint ? (
            <dd className="mt-1.5 text-xs text-[var(--faint)]">{k.hint}</dd>
          ) : null}
        </Panel>
      ))}
    </dl>
  ) : null;
