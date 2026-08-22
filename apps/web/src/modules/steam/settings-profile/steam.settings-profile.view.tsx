"use client";

import { ApiKeyPanel } from "@/components/ApiKeyPanel";
import {
  Button,
  EmptyState,
  PageHeader,
  Panel,
  ResourceStatus,
  SkeletonText,
} from "@questorylabs/ui";
import { getMusicUrl } from "@/lib/music";
import { getWatchUrl } from "@/lib/watch";
import { DEFAULT_PRICE_REGIONS } from "./steam.settings-profile.constants";
import type { ProfileSettingsViewProps } from "./steam.settings-profile.types";

export const ProfileSettingsView = (props: Record<string, unknown>) => {
  const {
    regions,
    countryCode,
    onCountryChange,
    save,
    message,
    error,
    selected,
    dirty,
    user,
    showMusic,
    showWatch,
  } = props as ProfileSettingsViewProps;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Set your Steam store price region. This controls Cost, wishlist deals, library value, and family pricing — pick India for INR."
      />

      <Panel wrapperClassName="max-w-lg" className="p-5">
        <h2 className="font-display text-lg font-bold tracking-tight">
          Price region
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {user?.priceRegionLocked
            ? "Locked to your choice — Steam login will not change it."
            : "Currently following Steam account country until you save a choice."}
        </p>

        <ResourceStatus
          failed={regions.failed}
          empty={regions.empty}
          loading={<SkeletonText lines={2} className="mt-4" />}
          error={
            <EmptyState
              size="sm"
              className="mt-4"
              title={
                <span className="text-[var(--danger)]">
                  Could not load price regions.
                </span>
              }
            />
          }
        >
          <>
            <label className="mt-4 block text-sm">
              <span className="text-[var(--muted)]">Country / currency</span>
              <select
                value={countryCode}
                onChange={(e) => onCountryChange(e.target.value)}
                disabled={save.busy}
                className="mt-1.5 w-full rounded-md border border-[var(--line)] bg-[var(--bg-2)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
              >
                {(regions.value || DEFAULT_PRICE_REGIONS).map((r) => (
                  <option key={r.countryCode} value={r.countryCode}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <p className="mt-2 font-mono text-xs text-[var(--faint)]">
                Prices will use {selected.currency}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                disabled={!dirty || save.busy || !countryCode}
                onClick={() => save.submit(countryCode)}
              >
                {save.busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </>
        </ResourceStatus>

        {message && (
          <p className="mt-3 text-sm text-[var(--accent)]">{message}</p>
        )}
        {error && (
          <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
        )}
        {save.failed && !error ? (
          <p className="mt-3 text-sm text-[var(--danger)]">
            Failed to update price region
          </p>
        ) : null}
      </Panel>

      {showMusic && (
        <ApiKeyPanel
          type="music_ingest"
          title="Music ingest (ListenBrainz)"
          description="Generate a personal token for multi-scrobbler / ListenBrainz clients."
          endpointHint={`Endpoint: ${getMusicUrl()}/1/`}
        />
      )}

      {showWatch && (
        <ApiKeyPanel
          type="watch_webhook"
          title="Watch webhook key"
          description="Personal secret for Plex/Jellyfin webhooks."
          endpointHint={`POST ${getWatchUrl()}/webhooks/plex · ${getWatchUrl()}/webhooks/jellyfin`}
        />
      )}
    </>
  );
};
