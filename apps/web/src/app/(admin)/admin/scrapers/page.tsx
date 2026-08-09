"use client";

import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
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
  const store = useStore();
  const [providerKey, setProviderKey] = useState<string>("letterboxd");
  const [viewIterationId, setViewIterationId] = useState<string | null>(null);

  const providers = useResource({
    id: ["admin-scraper-providers"],
    load: () =>
      api<ScraperProviderSummary[]>("/admin/scrapers/providers"),
  });

  const detail = useResource({
    id: ["admin-scraper-provider", providerKey],
    load: () =>
      api<ScraperProviderDetail>(`/admin/scrapers/providers/${providerKey}`),
    when: Boolean(providerKey),
  });

  const toggleEnabled = useAction({
    run: (enabled: boolean) =>
      api<ScraperProviderDetail>(`/admin/scrapers/providers/${providerKey}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: () => {
      store.touch(["admin-scraper-provider", providerKey]);
      store.touch(["admin-scraper-providers"]);
    },
  });

  useEffect(() => {
    if (!providerKey && providers.value?.length) {
      setProviderKey(providers.value[0].key);
    }
  }, [providers.value, providerKey]);

  useEffect(() => {
    if (!detail.value) return;
    if (detail.value.openIteration) {
      setViewIterationId(detail.value.openIteration.id);
      return;
    }
    if (detail.value.current) {
      setViewIterationId(detail.value.current.id);
    }
  }, [detail.value]);

  const viewing =
    detail.value?.current?.id === viewIterationId
      ? detail.value.current
      : detail.value?.previous.find((row) => row.id === viewIterationId) ??
        detail.value?.current ??
        null;

  const viewingReadOnly =
    viewing &&
    viewing.id !== detail.value?.openIteration?.id &&
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
            {(providers.value ?? []).map((provider) => (
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
          {detail.value ? (
            <>
              <Panel className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold">
                      {detail.value.label}
                    </h2>
                    {detail.value.description ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {detail.value.description}
                      </p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--ink)]">
                    <input
                      type="checkbox"
                      checked={detail.value.enabled}
                      disabled={toggleEnabled.busy}
                      onChange={(e) => toggleEnabled.submit(e.target.checked)}
                    />
                    Provider enabled (cron sync)
                  </label>
                </div>
              </Panel>

              <Panel className="p-5">
                <ScraperIterationList
                  current={detail.value.current}
                  previous={detail.value.previous}
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
                detail={detail.value}
              />
            </>
          ) : detail.empty ? (
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
