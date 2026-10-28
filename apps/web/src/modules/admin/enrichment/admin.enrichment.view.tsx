"use client";

import { useState } from "react";
import { Button, EmptyState } from "@/components/ui";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { AdminStat } from "../shared/components/AdminStat";
import {
  DOMAIN_OPTIONS,
  STATUS_OPTIONS,
  TABS,
  isRequeueDomain,
} from "./admin.enrichment.constants";
import type { AdminEnrichmentViewProps } from "./admin.enrichment.types";
import { EnrichmentTable } from "./components/EnrichmentTable";
import { RequeueDialog, type RequeueTarget } from "./components/RequeueDialog";

export const AdminEnrichmentView = (props: Record<string, unknown>) => {
  const {
    domain,
    setDomain,
    status,
    setStatus,
    page,
    setPage,
    data,
    trigger,
    requeue,
  } = props as AdminEnrichmentViewProps;
  const [confirm, setConfirm] = useState<RequeueTarget | null>(null);

  const activeCounts = data.value?.counts?.[domain];
  const failed = activeCounts?.failed ?? 0;
  const canRequeue = isRequeueDomain(domain);
  const totalPages = data.value
    ? Math.max(1, Math.ceil(data.value.total / data.value.pageSize))
    : 1;
  const activeTab = TABS.find((t) => t.id === domain)!;

  const onConfirm = () => {
    if (!confirm || !isRequeueDomain(domain)) return;
    requeue.submit(
      confirm.kind === "all"
        ? { domain, allFailed: true }
        : { domain, ids: [confirm.item.id] },
    );
    setConfirm(null);
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div
        className="q-in flex flex-wrap items-center justify-between gap-3"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <SegmentedControl
          label="Domain"
          value={domain}
          onChange={setDomain}
          options={DOMAIN_OPTIONS}
        />
        <div className="flex flex-wrap items-center gap-2">
          {canRequeue && failed > 0 ? (
            <button
              type="button"
              disabled={requeue.busy}
              onClick={() => setConfirm({ kind: "all", count: failed })}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-[var(--danger)]/40 bg-[var(--danger)]/[0.12] px-[18px] text-sm text-[color-mix(in_srgb,var(--danger)_30%,white)] transition-colors hover:bg-[var(--danger)]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Recover {failed} failed
            </button>
          ) : null}
          <Button
            variant="secondary"
            disabled={trigger.busy}
            onClick={() => trigger.submit()}
          >
            Run sync recovery
          </Button>
        </div>
      </div>

      {trigger.failed ? (
        <p className="text-sm text-[var(--danger)]">
          {(trigger.error as Error).message}
        </p>
      ) : null}
      {requeue.failed ? (
        <p className="text-sm text-[var(--danger)]">
          {(requeue.error as Error).message}
        </p>
      ) : null}
      {requeue.succeeded && requeue.value ? (
        <p className="text-sm text-[var(--ok)]">
          Requeued {requeue.value.requeued} job
          {requeue.value.requeued === 1 ? "" : "s"}.
        </p>
      ) : null}

      <p className="px-1 text-sm text-[var(--muted)]">{activeTab.hint}</p>

      <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        <AdminStat
          label="Pending"
          value={activeCounts?.pending ?? "—"}
          tone="warn"
          index={2}
        />
        <AdminStat
          label="Running"
          value={activeCounts?.running ?? "—"}
          tone="muted"
          live={Boolean(activeCounts?.running)}
          index={3}
        />
        <AdminStat
          label="Failed"
          value={activeCounts?.failed ?? "—"}
          tone="danger"
          index={4}
        />
        <AdminStat
          label="Completed · 24h"
          value={activeCounts?.completed24h ?? "—"}
          tone="ok"
          index={5}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          label="Status filter"
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
        {data.value ? (
          <span className="font-mono text-[10px] text-[var(--faint)]">
            {data.value.total} job{data.value.total === 1 ? "" : "s"}
            {status !== "all" ? ` · ${status}` : ""}
            {activeCounts ? ` · ${activeCounts.completed} completed all time` : ""}
          </span>
        ) : null}
      </div>

      <ResourceStatus
        failed={data.failed}
        empty={data.empty}
        loading={<SkeletonListRows />}
        error={
          <p className="text-sm text-[var(--danger)]">
            {(data.error as Error)?.message}
          </p>
        }
      >
        {data.value?.items.length ? (
          <EnrichmentTable
            items={data.value.items}
            canRequeue={canRequeue}
            busy={requeue.busy}
            onRequeue={(item) => setConfirm({ kind: "one", item })}
          />
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
        <div className="mt-2 flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="font-mono text-xs text-[var(--muted)]">
            {page} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <RequeueDialog
        target={confirm}
        busy={requeue.busy}
        onCancel={() => setConfirm(null)}
        onConfirm={onConfirm}
      />
    </div>
  );
};
