"use client";

import {
  Button,
  EmptyState,
  ResourceStatus,
  SkeletonText,
} from "@questorylabs/ui";
import { getMusicUrl } from "@/lib/music";
import { getWatchUrl } from "@/lib/watch";
import { SettingsHeader } from "../settings-shared/SettingsHeader";
import { ProfileAccountCard } from "./components/ProfileAccountCard";
import {
  ProfileApiKeysSection,
  type ProfileApiKeyRow,
} from "./components/ProfileApiKeysSection";
import { ProfileDangerZone } from "./components/ProfileDangerZone";
import { ProfileRecapSection } from "./components/ProfileRecapSection";
import { ProfileSection } from "./components/ProfileSection";
import {
  DEFAULT_PRICE_REGIONS,
  PROFILE_INPUT_CLASS,
} from "./steam.settings-profile.constants";
import { ProfileDataPanel } from "./steam.settings-profile-data.panel";
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
    exportStatus,
    generateExport,
    downloadExport,
    importJob,
    importFile,
    importConfirmOpen,
    onPickImportFile,
    onOpenImportConfirm,
    onCloseImportConfirm,
    runImport,
    apiKeys,
    recap,
    changePassword,
    deleteAccount,
  } = props as ProfileSettingsViewProps;

  const keyRows: ProfileApiKeyRow[] = [
    ...(showMusic
      ? [
          {
            type: "music_ingest" as const,
            title: "Music ingest (ListenBrainz)",
            description:
              "Generate a personal token for multi-scrobbler / ListenBrainz clients.",
            endpointHint: `Endpoint: ${getMusicUrl()}/1/`,
          },
        ]
      : []),
    ...(showWatch
      ? [
          {
            type: "watch_webhook" as const,
            title: "Watch webhook key",
            description: "Personal secret for Plex/Jellyfin webhooks.",
            endpointHint: `POST ${getWatchUrl()}/webhooks/plex · ${getWatchUrl()}/webhooks/jellyfin`,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-[820px] flex-col gap-3.5">
      <SettingsHeader
        active="profile"
        title={
          <>
            Your account,{" "}
            <span className="font-serif text-[#bdbdc2]">your rules</span>
          </>
        }
      />

      <ProfileAccountCard user={user} changePassword={changePassword} />

      <ProfileSection
        id="profile-region"
        index={2}
        title="Price region"
        description="Set your Steam store price region. This controls Cost, wishlist deals, library value, and family pricing — pick India for INR."
      >
        <p className="mt-1 text-xs text-[var(--faint)]">
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
          <div className="mt-4 flex flex-wrap items-end gap-2.5">
            <label className="label-mono flex flex-col gap-1.5 text-[10px]">
              <span>Country / currency</span>
              <span className="relative">
                <select
                  value={countryCode}
                  onChange={(e) => onCountryChange(e.target.value)}
                  disabled={save.busy}
                  className={`${PROFILE_INPUT_CLASS} min-w-[260px] cursor-pointer appearance-none pr-[38px] [&>option]:bg-[#151517]`}
                >
                  {(regions.value || DEFAULT_PRICE_REGIONS).map((r) => (
                    <option key={r.countryCode} value={r.countryCode}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute top-1/2 right-4 h-2.5 w-2.5 -translate-y-1/2 fill-none stroke-[var(--muted)] stroke-[2.4]"
                  strokeLinecap="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </label>
            <Button
              className="min-h-[46px]"
              disabled={!dirty || save.busy || !countryCode}
              onClick={() => save.submit(countryCode)}
            >
              {save.busy ? "Saving…" : "Save"}
            </Button>
          </div>
          {selected && (
            <p className="mt-2 font-mono text-xs text-[var(--faint)]">
              Prices will use {selected.currency}
            </p>
          )}
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
      </ProfileSection>

      <ProfileApiKeysSection rows={keyRows} apiKeys={apiKeys} />

      <ProfileRecapSection recap={recap} />

      <ProfileDataPanel
        exportStatus={exportStatus}
        generateExport={generateExport}
        downloadExport={downloadExport}
        importJob={importJob}
        importFile={importFile}
        importConfirmOpen={importConfirmOpen}
        onPickImportFile={onPickImportFile}
        onOpenImportConfirm={onOpenImportConfirm}
        onCloseImportConfirm={onCloseImportConfirm}
        runImport={runImport}
      />

      <ProfileDangerZone deleteAccount={deleteAccount} />
    </div>
  );
};
