"use client";

import { Button, EmptyState, PageHeader, Panel } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { TABS, STATUS_FILTERS } from "./admin.enrichment.constants";
import type { AdminEnrichmentViewProps } from "./admin.enrichment.types";
import { formatWhen } from "./admin.enrichment.utils";
import { MiniStat } from "./components/MiniStat";
import { StatusPill } from "./components/StatusPill";

export const AdminEnrichmentView = (props: Record<string, unknown>) => {
  const { domain, setDomain, status, setStatus, page, setPage, data, trigger } =
    props as AdminEnrichmentViewProps;

  const counts = data.value?.counts;
  const activeCounts = counts?.[domain];
  const totalPages = data.value
    ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize))
    : 1;
  const activeTab = TABS.find((t) => t.id === domain)!;

  return (
    <>
      <PageHeader
        title="Enrichment"
        description="MusicBrainz, TMDB, and Steam metadata job queues."
        actions={
          <Button
            variant="secondary"
            disabled={trigger.busy}
            onClick={() => trigger.submit()}
          >
            Recover failed
          </Button>
        }
      />

      {trigger.failed ? (
        <p className="mb-4 text-sm text-[var(--warm)]">
          {(trigger.error as Error).message}
        </p>
      ) : null}

      <div
        className="mb-6 flex gap-1 border-b border-[var(--line)]"
        role="tablist"
        aria-label="Enrichment domain"
      >
        {TABS.map((tab) => {
          const bucket = counts?.[tab.id];
          const active = domain === tab.id;
          const queue = bucket ? bucket.pending + bucket.running : null;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDomain(tab.id)}
              className={`relative -mb-px flex items-center gap-2 px-4 py-2.5 text-sm transition ${
                active
                  ? "border-b-2 border-[var(--accent)] font-medium text-[var(--ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {tab.label}
              {queue != null ? (
                <span
                  className={`font-mono text-[10px] tabular-nums ${
                    queue > 0 ? "text-[var(--warm)]" : "text-[var(--faint)]"
                  }`}
                >
                  {queue}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <p className="mb-4 text-sm text-[var(--muted)]">{activeTab.hint}</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Pending" value={activeCounts?.pending} tone="warm" />
        <MiniStat label="Running" value={activeCounts?.running} tone="warm" />
        <MiniStat label="Failed" value={activeCounts?.failed} tone="danger" />
        <MiniStat label="Completed" value={activeCounts?.completed} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Status filter">
          {STATUS_FILTERS.map((f) => {
            const active = status === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatus(f.id)}
                className={`px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] transition ${
                  active
                    ? "bg-[var(--accent-dim)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[var(--bg-2)] hover:text-[var(--ink)]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        {data.value ? (
          <span className="font-mono text-[10px] text-[var(--faint)]">
            {data.value.total} job{data.value.total === 1 ? "" : "s"}
            {status !== "all" ? ` · ${status}` : ""}
          </span>
        ) : null}
      </div>

      <ResourceStatus
        failed={data.failed}
        empty={data.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="text-sm text-[var(--warm)]">
            {(data.error as Error)?.message}
          </p>
        }
      >
        {data.value?.items.length ? (
          <Panel className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                    <th className="px-4 py-3 font-normal">Status</th>
                    <th className="px-4 py-3 font-normal">
                      {domain === "game"
                        ? "User"
                        : domain === "music"
                          ? "Track"
                          : "Title"}
                    </th>
                    <th className="px-4 py-3 font-normal">Attempts</th>
                    <th className="px-4 py-3 font-normal">Created</th>
                    <th className="px-4 py-3 font-normal">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {data.value.items.map((job) => (
                    <tr
                      key={job.id}
                      className="border-t border-[var(--line)] align-top first:border-t-0"
                    >
                      <td className="px-4 py-3">
                        <StatusPill status={job.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--ink)]">
                          {job.label}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-[var(--faint)]">
                          {job.detail || job.refId.slice(0, 8)}
                          {" · "}
                          {job.id.slice(0, 8)}
                        </div>
                        {job.error ? (
                          <p className="mt-1 max-w-md text-xs text-[var(--warm)]">
                            {job.error}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums text-[var(--muted)]">
                        {job.attempts ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-[var(--muted)]">
                        {formatWhen(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[10px] text-[var(--muted)]">
                        {job.completedAt ? formatWhen(job.completedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        ) : (
          <EmptyState
            title="No jobs in this view"
            description={
              status === "all"
                ? "Queue is empty — new enrichment work will show up here."
                : `No ${status} jobs right now.`
            }
          />
        )}
      </ResourceStatus>

      {data.value && data.value.total > data.value.pageSize ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5"
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5"
          >
            Next
          </Button>
        </div>
      ) : null}
    </>
  );
};
