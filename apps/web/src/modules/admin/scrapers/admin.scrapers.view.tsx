"use client";

import { PageHeader, Panel, StateMessage } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { ScraperIterationList } from "./components/ScraperIterationList";
import { ScraperIterationWorkflow } from "./components/ScraperIterationWorkflow";
import { ScraperTestPanel } from "./components/ScraperTestPanel";
import type { AdminScrapersViewProps } from "./admin.scrapers.types";

export const AdminScrapersView = (props: Record<string, unknown>) => {
  const {
    providerKey,
    setProviderKey,
    viewIterationId,
    setViewIterationId,
    providers,
    detail,
    toggleEnabled,
    viewing,
    viewingReadOnly,
  } = props as AdminScrapersViewProps;

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
          <ResourceStatus
            failed={providers.failed}
            empty={providers.empty}
            loading={<SkeletonListRows count={4} className="mt-2" />}
            error={
              <p className="mt-2 px-2 text-sm text-[var(--warm)]">
                {(providers.error as Error)?.message}
              </p>
            }
          >
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
          </ResourceStatus>
        </Panel>

        <div className="space-y-6">
          <ResourceStatus
            failed={detail.failed}
            empty={detail.empty}
            loading={
              <Panel className="p-5">
                <StateMessage variant="loading" className="mt-0" />
              </Panel>
            }
            error={
              <p className="text-sm text-[var(--warm)]">
                {(detail.error as Error)?.message}
              </p>
            }
          >
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
            ) : (
              <Panel className="p-5 text-sm text-[var(--muted)]">
                Select a provider.
              </Panel>
            )}
          </ResourceStatus>
        </div>
      </div>
    </>
  );
};
