"use client";

import { EmptyState, ResourceStatus, SkeletonTileGrid } from "@questorylabs/ui";
import { SettingsHeader } from "../settings-shared/SettingsHeader";
import { StoreComingLaterCard } from "./components/StoreComingLaterCard";
import { StoresSteamHero } from "./components/StoresSteamHero";
import { STORE_STATUS_FALLBACK } from "./steam.settings-stores.constants";
import type { StoresSettingsViewProps } from "./steam.settings-stores.types";

export const StoresSettingsView = (props: Record<string, unknown>) => {
  const { stores, navCounts } = props as StoresSettingsViewProps;
  const rows = stores.value?.length ? stores.value : STORE_STATUS_FALLBACK;
  const steam = rows.find((row) => row.store === "steam");
  const others = rows.filter((row) => row.store !== "steam");

  return (
    <div className="mx-auto w-full max-w-[820px]">
      <SettingsHeader
        active="stores"
        title={
          <>
            Your <span className="font-serif">stores</span>
          </>
        }
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
        <div className="grid gap-4">
          {steam ? <StoresSteamHero status={steam} navCounts={navCounts} /> : null}
          {others.map((status, index) => (
            <StoreComingLaterCard key={status.store} status={status} index={index + 2} />
          ))}
        </div>
      </ResourceStatus>
    </div>
  );
};
