"use client";

import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import { useEffect, useState } from "react";
import { Button, EmptyState, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { ADMIN_ENRICHMENT_PAGE_SIZE } from "@/lib/pagination";

type Domain = "music" | "watch" | "game";
type StatusFilter = "all" | "pending" | "running" | "completed" | "failed";

type StatusBucket = {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  total: number;
};

type EnrichmentItem = {
  id: string;
  refId: string;
  label: string;
  detail: string | null;
  status: string;
  attempts: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  startedAt?: string | null;
};

type EnrichmentResponse = {
  domain: Domain;
  page: number;
  pageSize: number;
  total: number;
  counts: {
    music: StatusBucket;
    watch: StatusBucket;
    game: StatusBucket;
  };
  items: EnrichmentItem[];
};

const TABS: { id: Domain; label: string; hint: string }[] = [
  { id: "music", label: "Music", hint: "MusicBrainz track enrichment" },
  { id: "watch", label: "Watch", hint: "TMDB / AniList title enrichment" },
  { id: "game", label: "Game", hint: "Steam metadata refresh jobs" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "running", label: "Running" },
  { id: "completed", label: "Done" },
  { id: "failed", label: "Failed" },
];

export default function AdminEnrichmentPage() {
  const qc = useQueryClient();
  const [domain, setDomain] = useState<Domain>("music");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [domain, status]);

  const data = useQuery({
    queryKey: ["admin-enrichment", domain, page, status],
    queryFn: () => {
      const params = new URLSearchParams({
        domain,
        page: String(page),
        pageSize: String(ADMIN_ENRICHMENT_PAGE_SIZE),
        status,
      });
      return api<EnrichmentResponse>(`/admin/enrichment?${params}`);
    },
    refetchInterval: 15_000,
  });

  const trigger = useMutation({
    mutationFn: () =>
      api("/admin/enrichment/trigger", {
        method: "POST",
        body: JSON.stringify({ action: "recover-failed-sync" }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrichment"] });
    },
  });

  const counts = data.data?.counts;
  const activeCounts = counts?.[domain];
  const totalPages = data.data
    ? Math.max(1, Math.ceil(data.data.total / data.data.pageSize))
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
            disabled={trigger.isPending}
            onClick={() => trigger.mutate()}
          >
            Recover failed
          </Button>
        }
      />

      {trigger.isError ? (
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
                    queue > 0
                      ? "text-[var(--warm)]"
                      : "text-[var(--faint)]"
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
        <MiniStat
          label="Pending"
          value={activeCounts?.pending}
          tone="warm"
        />
        <MiniStat
          label="Running"
          value={activeCounts?.running}
          tone="warm"
        />
        <MiniStat
          label="Failed"
          value={activeCounts?.failed}
          tone="danger"
        />
        <MiniStat
          label="Completed"
          value={activeCounts?.completed}
        />
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
        {data.data ? (
          <span className="font-mono text-[10px] text-[var(--faint)]">
            {data.data.total} job{data.data.total === 1 ? "" : "s"}
            {status !== "all" ? ` · ${status}` : ""}
          </span>
        ) : null}
      </div>

      {data.isLoading ? (
        <p className="text-sm text-[var(--muted)]">Loading jobs…</p>
      ) : null}
      {data.isError ? (
        <p className="text-sm text-[var(--warm)]">
          {(data.error as Error).message}
        </p>
      ) : null}

      {!data.isLoading && !data.isError && !(data.data?.items.length) ? (
        <EmptyState
          title="No jobs in this view"
          description={
            status === "all"
              ? "Queue is empty — new enrichment work will show up here."
              : `No ${status} jobs right now.`
          }
        />
      ) : null}

      {data.data?.items.length ? (
        <Panel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--faint)]">
                  <th className="px-4 py-3 font-normal">Status</th>
                  <th className="px-4 py-3 font-normal">
                    {domain === "game" ? "User" : domain === "music" ? "Track" : "Title"}
                  </th>
                  <th className="px-4 py-3 font-normal">Attempts</th>
                  <th className="px-4 py-3 font-normal">Created</th>
                  <th className="px-4 py-3 font-normal">Finished</th>
                </tr>
              </thead>
              <tbody>
                {data.data.items.map((job) => (
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
      ) : null}

      {data.data && data.data.total > data.data.pageSize ? (
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
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | undefined;
  tone?: "warm" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[var(--danger)]"
      : tone === "warm"
        ? "text-[var(--warm)]"
        : "text-[var(--ink)]";
  const showTone = value != null && value > 0;
  return (
    <Panel className="p-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--faint)]">
        {label}
      </div>
      <div
        className={`mt-1 text-xl tabular-nums ${
          showTone ? toneClass : "text-[var(--ink)]"
        }`}
      >
        {value ?? "—"}
      </div>
    </Panel>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:
      "border border-[var(--warm)] text-[var(--warm)]",
    running:
      "bg-[color-mix(in_srgb,var(--warm)_18%,transparent)] text-[var(--warm)]",
    completed:
      "bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--accent)]",
    failed:
      "bg-[color-mix(in_srgb,var(--danger)_18%,transparent)] text-[var(--danger)]",
  };
  const label =
    status === "completed"
      ? "Done"
      : status === "pending"
        ? "Queued"
        : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-block px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
        styles[status] || "text-[var(--muted)]"
      }`}
    >
      {label}
    </span>
  );
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
