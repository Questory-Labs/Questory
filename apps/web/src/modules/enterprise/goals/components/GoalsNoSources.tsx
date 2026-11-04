"use client";

import Link from "next/link";
import { EmptyState } from "@questorylabs/ui";
import { useMusicEnabled } from "@/hooks/useMusicEnabled";
import { useReadEnabled } from "@/hooks/useReadEnabled";
import { useWatchEnabled } from "@/hooks/useWatchEnabled";
import { GOAL_DOMAIN_COLOR } from "@/lib/goals";
import { GOAL_SOURCE_LINKS } from "../enterprise.goals.constants";

export const GoalsNoSources = () => {
  const { flagOn: musicOn } = useMusicEnabled();
  const { flagOn: watchOn } = useWatchEnabled();
  const { flagOn: readOn } = useReadEnabled();
  const enabled = { games: true, music: musicOn, watch: watchOn, read: readOn };
  return (
    <section aria-label="Connect a source" className="flex flex-col gap-3">
      <EmptyState
        title="Connect a source to get goals"
        description="Goals are built from what you actually play, watch, read, and listen to. Connect one source and we'll start picking goals across every category."
      />
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {GOAL_SOURCE_LINKS.filter((source) => enabled[source.key]).map((source) => (
          <li key={source.key}>
            <Link
              href={source.href}
              className="q-row flex items-center justify-between gap-3 rounded-[22px] border border-white/[0.09] px-5 py-4"
            >
              <span className="min-w-0">
                <span
                  className="block text-base tracking-[-0.01em]"
                  style={{ color: GOAL_DOMAIN_COLOR[source.key] }}
                >
                  {source.label}
                </span>
                <span className="block text-sm text-[var(--muted)]">{source.detail}</span>
              </span>
              <span aria-hidden="true" className="text-[13px] text-[var(--ink)]">
                Connect
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
