"use client";

import Link from "next/link";
import { Panel } from "@questorylabs/ui";
import { formatRelativePlayed } from "@/lib/dates";
import type { DashboardActivityItem } from "../dashboard-activity";

const DOMAIN_LABEL: Record<DashboardActivityItem["domain"], string> = {
  games: "Game",
  music: "Music",
  watch: "Watch",
  read: "Read",
};

export const ActivityFeed = ({
  items,
  title,
}: {
  items: DashboardActivityItem[];
  title?: string;
}) => (
  <section className={title ? "mt-10" : undefined}>
    {title ? (
      <h2 className="mb-3 font-display text-xl font-bold tracking-tight">{title}</h2>
    ) : null}
    {items.length ? (
      <Panel variant="outline" className="divide-y divide-[var(--line)]">
        {items.map((row) => (
          <Link
            key={row.id}
            href={row.href}
            className="flex items-center justify-between gap-4 px-4 py-3 text-sm hover:bg-[var(--bg-2)]"
          >
            <span className="min-w-0 truncate">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                {DOMAIN_LABEL[row.domain]}
              </span>
              <span className="ml-2 font-medium">{row.name}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-[var(--muted)]">
              {row.meta ?? formatRelativePlayed(row.at)}
            </span>
          </Link>
        ))}
      </Panel>
    ) : (
      <p className="text-sm text-[var(--muted)]">No recent activity yet.</p>
    )}
  </section>
);
