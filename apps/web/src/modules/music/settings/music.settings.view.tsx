"use client";

import { LastFmScrobblerCard } from "./components/LastFmScrobblerCard";
import { MultiScrobblerCard } from "./components/MultiScrobblerCard";
import { MusicSectionHeading } from "./components/MusicSourceCard";
import { PageHeader } from "@/components/ui";
import { HistoryImportSection } from "./components/HistoryImportSection";
import type { MusicSettingsViewProps } from "./music.settings.types";

export const MusicSettingsView = (props: Record<string, unknown>) => {
  const view = props as MusicSettingsViewProps;

  return (
    <>
      <PageHeader
        eyebrow="Music"
        title="Sources"
        description="Connect Last.fm for live polling, or point multi-scrobbler at the ListenBrainz ingest API. Native scrobbling and ListenBrainz ingest cannot run at the same time."
      />

      {view.lastfmFlash === "connected" ? (
        <p className="mb-4 text-sm text-[var(--accent)]">
          Last.fm connected — ListenBrainz ingest is now disabled for this account.
        </p>
      ) : null}
      {view.lastfmFlash && view.lastfmFlash !== "connected" ? (
        <p className="mb-4 text-sm text-[var(--danger)]" role="alert">
          Could not connect Last.fm
          {view.lastfmFlash !== "error" ? `: ${view.lastfmFlash}` : ""}.
        </p>
      ) : null}

      <section className="mb-10">
        <MusicSectionHeading
          eyebrow="Live"
          title="Live sources"
          description="Native Last.fm polling, or ListenBrainz-compatible ingest. Connecting Last.fm disables multi-scrobbler for this user."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <LastFmScrobblerCard />
          <MultiScrobblerCard
            active={view.ingestActive}
            nativeLocked={view.nativeLocked}
          />
        </div>
      </section>

      <HistoryImportSection
        fileName={view.fileName}
        message={view.message}
        jobId={view.jobId}
        job={view.job}
        restoring={view.restoring}
        dragging={view.dragging}
        busy={view.busy}
        failed={view.failed}
        showProgress={view.showProgress}
        inputRef={view.inputRef}
        onInputChange={view.onInputChange}
        onDrop={view.onDrop}
        setDragging={view.setDragging}
      />
    </>
  );
};
