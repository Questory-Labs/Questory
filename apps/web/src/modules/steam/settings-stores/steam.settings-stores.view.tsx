"use client";

import { StoreBadge } from "@/components/StoreBadge";
import {
  EmptyState,
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonTileGrid,
} from "@questorylabs/ui";
import {
  STORE_COPY,
  STORE_STATUS_FALLBACK,
} from "./steam.settings-stores.constants";
import type { StoresSettingsViewProps } from "./steam.settings-stores.types";

export const StoresSettingsView = (props: Record<string, unknown>) => {
  const { stores } = props as StoresSettingsViewProps;
  const rows = stores.value?.length ? stores.value : STORE_STATUS_FALLBACK;

  return (
    <>
      <PageHeader
        title="Stores"
        description="Steam powers sync today. Epic and GOG appear in library filters and badges; account import will land when the data sources are solid enough."
      />

      <ResourceStatus
        failed={stores.failed}
        empty={stores.empty}
        loading={<SkeletonTileGrid count={3} />}
        error={
          <EmptyState
            title={
              <span className="text-[var(--danger)]">Could not load stores.</span>
            }
          />
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          {rows.map((status) => {
            const copy = STORE_COPY[status.store];
            const comingLater =
              status.store !== "steam" &&
              (status.status === "coming_later" || status.syncEnabled === false);
            return (
              <Panel key={status.store} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <StoreBadge store={status.store} />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--faint)]">
                    {comingLater ? "Coming later" : "Connected"}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-lg font-bold tracking-tight">
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">{copy.blurb}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {status.store === "steam" ? (
                    <span className="border border-[var(--line)] px-3 py-1.5 text-sm text-[var(--muted)]">
                      Sync runs automatically
                    </span>
                  ) : (
                    <span className="border border-dashed border-[var(--line)] px-3 py-1.5 text-sm text-[var(--faint)]">
                      Manual import planned
                    </span>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      </ResourceStatus>
    </>
  );
};
