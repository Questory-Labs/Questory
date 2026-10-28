"use client";

import type { CSSProperties } from "react";
import { EmptyState, StateMessage } from "@/components/ui";
import { MusicSettingsController } from "@/modules/music/settings/music.settings.controller";
import { MusicSettingsView } from "@/modules/music/settings/music.settings.view";
import { ReadSettingsView } from "@/modules/read/settings/read.settings.view";
import { WatchSettingsController } from "@/modules/watch/settings/watch.settings.controller";
import { WatchSettingsView } from "@/modules/watch/settings/watch.settings.view";
import { SourcesFlash } from "./components/SourcesFlash";
import { SourcesHeader } from "./components/SourcesHeader";
import type { MediaSourcesViewProps } from "./media.sources.types";
import { SOURCES_ACCENT } from "./media.sources.utils";

export const MediaSourcesView = (props: Record<string, unknown>) => {
  const { tabs, tab, loading, onTabChange, overview, flash = [] } = props as MediaSourcesViewProps;

  if (!tab) {
    return loading ? (
      <StateMessage variant="loading" />
    ) : (
      <EmptyState
        title="No media modules enabled"
        description="Music, Watch and Read sources appear here once an admin turns those modules on."
      />
    );
  }

  return (
    <div
      className="mx-auto flex max-w-[980px] flex-col gap-4"
      style={{ "--source-accent": SOURCES_ACCENT[tab] } as CSSProperties}
    >
      <SourcesHeader tabs={tabs} tab={tab} overview={overview?.value} onTabChange={onTabChange} />
      <SourcesFlash messages={flash} />
      <div key={tab} role="tabpanel" className="q-in">
        {tab === "music" ? (
          <MusicSettingsController>
            <MusicSettingsView />
          </MusicSettingsController>
        ) : tab === "watch" ? (
          <WatchSettingsController>
            <WatchSettingsView />
          </WatchSettingsController>
        ) : (
          <ReadSettingsView />
        )}
      </div>
    </div>
  );
};
