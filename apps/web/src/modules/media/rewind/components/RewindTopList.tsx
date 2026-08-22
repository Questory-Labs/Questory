"use client";

import type { RewindTopItem } from "@questorylabs/shared";
import { Panel } from "@questorylabs/ui";

export const RewindTopList = ({
  title,
  items,
  unitLabel,
}: {
  title: string;
  items: RewindTopItem[];
  unitLabel?: string;
}) => {
  if (!items?.length) return null;
  return (
    <Panel className="p-5 h-full">
      <h3 className="text-[var(--muted)] text-sm font-medium uppercase tracking-wider mb-4">
        {title}
      </h3>
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-4">
            <div className="w-6 text-center font-mono text-sm text-[var(--faint)]">
              {i + 1}
            </div>
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="w-10 h-10 object-cover rounded bg-[var(--bg-2)]"
              />
            ) : (
              <div className="w-10 h-10 rounded bg-[var(--bg-2)]" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[var(--ink)] font-medium truncate">
                {item.name}
              </div>
              {item.subtitle && (
                <div className="text-[var(--muted)] text-sm truncate">
                  {item.subtitle}
                </div>
              )}
            </div>
            <div className="text-sm font-mono text-[var(--muted)]">
              {item.count} {unitLabel}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};
