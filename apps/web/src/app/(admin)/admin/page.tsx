"use client";

import { useResource } from "@questorylabs/qhttp/react";
import { StatCard } from "@/components/StatCard";
import { PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type Overview = {
  users: { total: number; admins: number };
  signup: { open: boolean; enabledSetting: boolean };
  syncJobs: { pending: number; running: number; failed: number };
  enrichment: {
    musicPending: number;
    watchPending: number;
    importsActive: number;
  };
  music: { ok?: boolean };
  watch: { ok?: boolean };
  abuse: Record<string, number>;
  recentCronRuns: {
    id: string;
    jobName: string;
    status: string;
    startedAt: string;
  }[];
};

export default function AdminDashboardPage() {
  const overview = useResource({
    id: ["admin-overview"],
    load: () => api<Overview>("/admin/overview"),
    refreshEvery: 30_000,
  });

  const d = overview.value;

  return (
    <>
      <PageHeader
        title="Admin dashboard"
        description="Instance health, users, sync queues, and recent cron activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Users" value={d?.users.total ?? "—"} delay={0} />
        <StatCard label="Admins" value={d?.users.admins ?? "—"} delay={0.05} />
        <StatCard
          label="Signup"
          value={d ? (d.signup.open ? "Open" : "Closed") : "—"}
          delay={0.1}
        />
        <StatCard
          label="Sync failed"
          value={d?.syncJobs.failed ?? "—"}
          delay={0.15}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Music"
          value={d?.music?.ok ? "Up" : d ? "Down" : "—"}
          delay={0.05}
        />
        <StatCard
          label="Watch"
          value={d?.watch?.ok ? "Up" : d ? "Down" : "—"}
          delay={0.1}
        />
        <StatCard
          label="Music enrich pending"
          value={d?.enrichment.musicPending ?? "—"}
          delay={0.15}
        />
        <StatCard
          label="Watch enrich pending"
          value={d?.enrichment.watchPending ?? "—"}
          delay={0.2}
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel className="p-4">
          <h2 className="font-display text-lg font-bold">Abuse counters</h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-[var(--muted)]">
            {d
              ? Object.entries(d.abuse).map(([k, v]) => (
                  <li key={k} className="flex justify-between gap-4">
                    <span>{k}</span>
                    <span className="text-[var(--ink)]">{v}</span>
                  </li>
                ))
              : null}
          </ul>
        </Panel>

        <Panel className="p-4">
          <h2 className="font-display text-lg font-bold">Recent cron</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {(d?.recentCronRuns || []).map((r) => (
              <li
                key={r.id}
                className="flex justify-between gap-3 border-t border-[var(--line)] pt-2 first:border-0 first:pt-0"
              >
                <span>
                  {r.jobName}{" "}
                  <span className="text-[var(--muted)]">· {r.status}</span>
                </span>
                <span className="font-mono text-[10px] text-[var(--faint)]">
                  {new Date(r.startedAt).toLocaleString()}
                </span>
              </li>
            ))}
            {!d?.recentCronRuns?.length ? (
              <li className="text-[var(--muted)]">No runs yet.</li>
            ) : null}
          </ul>
        </Panel>
      </div>
    </>
  );
}
