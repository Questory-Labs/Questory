"use client";

import { Panel, StateMessage } from "@/components/ui";
import { ResourceStatus, SkeletonListRows } from "@questorylabs/ui";
import { TONE_TEXT } from "../shared/admin.tone";
import { AdminStatusDot } from "../shared/components/AdminStatusPill";
import { ScraperIterationList, statusLabel } from "./components/ScraperIterationList";
import { ScraperIterationWorkflow } from "./components/ScraperIterationWorkflow";
import { ScraperTestPanel } from "./components/ScraperTestPanel";
import type { AdminScrapersViewProps } from "./admin.scrapers.types";
import { providerStatus } from "./admin.scrapers.utils";

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

  const open = detail.value?.openIteration ?? null;
  const versionTag = open
    ? `v${open.version} ${statusLabel(open.status).toLowerCase()}`
    : detail.value?.current
      ? `v${detail.value.current.version} live`
      : null;

  return (
    <div className="flex flex-wrap items-start gap-3.5">
      <div
        className="panel q-in min-w-0 flex-[1_1_260px] p-1.5"
        style={{ "--i": 1 } as React.CSSProperties}
      >
        <ResourceStatus
          failed={providers.failed}
          empty={providers.empty}
          loading={<SkeletonListRows count={4} className="p-2" />}
          error={
            <p className="p-3 text-sm text-[var(--danger)]">
              {(providers.error as Error)?.message}
            </p>
          }
        >
          <ul aria-label="Providers" className="list-none">
            {(providers.value ?? []).map((provider) => {
              const state = providerStatus(provider);
              const selected = provider.key === providerKey;
              return (
                <li key={provider.key}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    className={`q-row flex min-h-[46px] w-full items-center gap-2.5 rounded-[18px] px-3.5 text-left text-sm ${
                      selected ? "bg-white/[0.08]" : ""
                    }`}
                    onClick={() => setProviderKey(provider.key)}
                  >
                    <AdminStatusDot tone={state.tone} />
                    <span className="min-w-0 flex-1 truncate text-[var(--ink)]">
                      {provider.label}
                    </span>
                    <span className={`font-mono text-[11px] ${TONE_TEXT[state.tone]}`}>
                      {state.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ResourceStatus>
      </div>

      <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-3.5">
        <ResourceStatus
          failed={detail.failed}
          empty={detail.empty}
          loading={
            <Panel className="p-5">
              <StateMessage variant="loading" className="mt-0" />
            </Panel>
          }
          error={
            <p className="text-sm text-[var(--danger)]">
              {(detail.error as Error)?.message}
            </p>
          }
        >
          {detail.value ? (
            <>
              <section
                aria-labelledby="scraper-title"
                className="panel q-in p-5"
                style={{ "--i": 2 } as React.CSSProperties}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 id="scraper-title" className="text-[17px] font-normal">
                      {detail.value.label}{" "}
                      {versionTag ? (
                        <span className="font-mono text-[11px] text-[var(--faint)]">
                          {versionTag}
                        </span>
                      ) : null}
                    </h2>
                    {detail.value.description ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {detail.value.description}
                      </p>
                    ) : null}
                  </div>
                  <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-full border border-[var(--line)] bg-white/[0.04] px-4 text-[13px] text-[var(--ink)]">
                    <input
                      type="checkbox"
                      className="accent-[var(--ok)]"
                      checked={detail.value.enabled}
                      disabled={toggleEnabled.busy}
                      onChange={(e) => toggleEnabled.submit(e.target.checked)}
                    />
                    Provider enabled (cron sync)
                  </label>
                </div>

                {toggleEnabled.failed ? (
                  <p className="mt-3 text-sm text-[var(--danger)]">
                    {(toggleEnabled.error as Error).message}
                  </p>
                ) : null}

                <div className="mt-4">
                  <ScraperIterationList
                    open={open}
                    current={detail.value.current}
                    previous={detail.value.previous}
                    selectedId={viewIterationId}
                    onSelect={setViewIterationId}
                  />
                </div>

                {viewingReadOnly && viewing ? (
                  <div className="mt-5 space-y-4 border-t border-[var(--line)] pt-5">
                    <div>
                      <h3 className="text-sm font-normal">
                        Preview v{viewing.version}
                      </h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
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
              </section>

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
  );
};
