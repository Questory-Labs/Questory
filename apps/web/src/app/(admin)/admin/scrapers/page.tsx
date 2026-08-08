"use client";

import { useMutation, useQuery, useQueryClient } from "@questorylabs/qhttp/react";
import { Button, PageHeader, Panel, StateMessage } from "@/components/ui";
import { ScraperIterationList } from "@/components/admin/scrapers/ScraperIterationList";
import { ScraperIterationWorkflow } from "@/components/admin/scrapers/ScraperIterationWorkflow";
import { ScraperTestPanel } from "@/components/admin/scrapers/ScraperTestPanel";
import { api } from "@/lib/api";
import type {
  ScraperProviderDetail,
  ScraperProviderSummary,
} from "@questorylabs/shared";
import { useEffect, useState } from "react";

export default function AdminScrapersPage() {
  const qc = useQueryClient();
  const [providerKey, setProviderKey] = useState<string>("letterboxd");
  const [viewIterationId, setViewIterationId] = useState<string | null>(null);

  const providers = useQuery({
    queryKey: ["admin-scraper-providers"],
    queryFn: () =>
      api<ScraperProviderSummary[]>("/admin/scrapers/providers"),
  });

  const detail = useQuery({
    queryKey: ["admin-scraper-provider", providerKey],
    queryFn: () =>
      api<ScraperProviderDetail>(`/admin/scrapers/providers/${providerKey}`),
    enabled: Boolean(providerKey),
  });

  const toggleEnabled = useMutation({
    mutationFn: (enabled: boolean) =>
      api<ScraperProviderDetail>(`/admin/scrapers/providers/${providerKey}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-scraper-provider", providerKey] });
      qc.invalidateQueries({ queryKey: ["admin-scraper-providers"] });
    },
  });

  useEffect(() => {
    if (!providerKey && providers.data?.length) {
      setProviderKey(providers.data[0].key);
    }
  }, [providers.data, providerKey]);

  useEffect(() => {
    if (!detail.data) return;
    if (detail.data.openIteration) {
      setViewIterationId(detail.data.openIteration.id);
      return;
    }
    if (detail.data.current) {
      setViewIterationId(detail.data.current.id);
    }
  }, [detail.data]);

  const viewing =
    detail.data?.current?.id === viewIterationId
      ? detail.data.current
      : detail.data?.previous.find((row) => row.id === viewIterationId) ??
        detail.data?.current ??
        null;

  const viewingReadOnly =
    viewing &&
    viewing.id !== detail.data?.openIteration?.id &&
    (viewing.status === "published" || viewing.status === "archived");

  return (
    <>
      <PageHeader
        title="Scrapers"
        description="One scraper per provider. Draft, validate, and publish iterations."
      />

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <Panel className="p-3">
          <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
            Providers
          </p>
          <ul className="mt-2 space-y-1">
            {(providers.data ?? []).map((provider) => (
              <li key={provider.key}>
                <button
                  type="button"
                  className={`w-full rounded px-2 py-2 text-left text-sm ${
                    provider.key === providerKey
                      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "text-[var(--ink)] hover:bg-[var(--bg-2)]"
                  }`}
                  onClick={() => setProviderKey(provider.key)}
                >
                  <span className="block font-medium">{provider.label}</span>
                  <span className="block font-mono text-[10px] text-[var(--faint)]">
                    {provider.enabled ? "sync on" : "sync off"}
                    {provider.hasOpenIteration ? " · draft open" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <div className="space-y-6">
          {detail.data ? (
            <>
              <Panel className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">
                      {detail.data.label}
                    </h2>
                    {detail.data.description ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {detail.data.description}
                      </p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={detail.data.enabled}
                      disabled={toggleEnabled.isPending}
                      onChange={(e) => toggleEnabled.mutate(e.target.checked)}
                    />
                    Provider enabled (cron sync)
                  </label>
                </div>
              </Panel>

              <Panel className="p-5">
                <ScraperIterationList
                  current={detail.data.current}
                  previous={detail.data.previous}
                  selectedId={viewIterationId}
                  onSelect={setViewIterationId}
                />
                {viewingReadOnly && viewing ? (
                  <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-6">
                    <div>
                      <h3 className="font-display text-sm font-bold">
                        Preview v{viewing.version}
                      </h3>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Read-only. Use a new iteration below to change the live
                        scraper.
                      </p>
                    </div>
                    <ScraperTestPanel
                      providerKey={providerKey}
                      iterationId={viewing.id}
                    />
                  </div>
                ) : null}
              </Panel>

              <ScraperIterationWorkflow
                providerKey={providerKey}
                detail={detail.data}
              />
            </>
          ) : detail.isLoading ? (
            <Panel className="p-5">
              <StateMessage variant="loading" className="mt-0" />
            </Panel>
          ) : (
            <Panel className="p-5 text-sm text-[var(--muted)]">
              Select a provider.
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
