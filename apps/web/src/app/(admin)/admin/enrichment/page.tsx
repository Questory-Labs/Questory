"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, PageHeader, Panel } from "@/components/ui";
import { api } from "@/lib/api";

type Enrichment = {
  music: {
    id: string;
    status: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }[];
  watch: {
    id: string;
    status: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }[];
  metadataRefresh: {
    id: string;
    userId: string;
    status: string;
    error: string | null;
  }[];
};

export default function AdminEnrichmentPage() {
  const qc = useQueryClient();
  const data = useQuery({
    queryKey: ["admin-enrichment"],
    queryFn: () => api<Enrichment>("/admin/enrichment"),
    refetchInterval: 15_000,
  });

  const trigger = useMutation({
    mutationFn: (action: "catalog-sync" | "recover-failed-sync") =>
      api("/admin/enrichment/trigger", {
        method: "POST",
        body: JSON.stringify({ action }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-enrichment"] });
    },
  });

  return (
    <>
      <PageHeader
        title="Enrichment"
        description="MusicBrainz / TMDB job queues and catalog recovery actions."
      />

      <Panel className="mb-6 flex flex-wrap gap-2 p-4">
        <Button
          variant="secondary"
          disabled={trigger.isPending}
          onClick={() => trigger.mutate("catalog-sync")}
        >
          Catalog sync
        </Button>
        <Button
          variant="secondary"
          disabled={trigger.isPending}
          onClick={() => trigger.mutate("recover-failed-sync")}
        >
          Recover failed sync
        </Button>
      </Panel>

      <section className="mb-8">
        <h2 className="font-display text-lg font-bold">Music enrichment</h2>
        <JobList jobs={data.data?.music || []} />
      </section>
      <section className="mb-8">
        <h2 className="font-display text-lg font-bold">Watch enrichment</h2>
        <JobList jobs={data.data?.watch || []} />
      </section>
      <section>
        <h2 className="font-display text-lg font-bold">Metadata refresh</h2>
        <div className="mt-3 space-y-2">
          {(data.data?.metadataRefresh || []).map((j) => (
            <Panel key={j.id} className="px-4 py-2 text-sm">
              {j.status} · user {j.userId.slice(0, 8)}
              {j.error ? (
                <span className="text-[var(--warm)]"> · {j.error}</span>
              ) : null}
            </Panel>
          ))}
          {!data.data?.metadataRefresh?.length ? (
            <p className="text-sm text-[var(--muted)]">No recent jobs.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}

function JobList({
  jobs,
}: {
  jobs: {
    id: string;
    status: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }[];
}) {
  if (!jobs.length) {
    return <p className="mt-2 text-sm text-[var(--muted)]">No recent jobs.</p>;
  }
  return (
    <div className="mt-3 space-y-2">
      {jobs.map((j) => (
        <Panel key={j.id} className="px-4 py-2 text-sm">
          <span className="font-mono text-[10px] text-[var(--faint)]">
            {j.id.slice(0, 8)}
          </span>{" "}
          {j.status} · attempts {j.attempts}
          {j.lastError ? (
            <span className="text-[var(--warm)]"> · {j.lastError}</span>
          ) : null}
        </Panel>
      ))}
    </div>
  );
}
