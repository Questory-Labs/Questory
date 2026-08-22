"use client";

import { AnimeListSourcesSection } from "./components/AnimeListSourcesSection";
import { PageHeader } from "@/components/ui";
import { LiveSourcesSection } from "./components/LiveSourcesSection";
import { LetterboxdImportSection } from "./components/LetterboxdImportSection";
import type { WatchSettingsViewProps } from "./watch.settings.types";

export const WatchSettingsView = (props: Record<string, unknown>) => {
  const view = props as WatchSettingsViewProps;

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="Sources"
        description="Connect a live source to keep Watch up to date. Letterboxd scrape sync uses admin-configured rules. Enrich with a CSV export below."
      />

      <LiveSourcesSection
        trakt={view.trakt}
        traktConnected={view.traktConnected}
        showTrakt={view.showTrakt}
        showAnilist={view.showAnilist}
        showWebhook={view.showWebhook}
        showingLive={view.showingLive}
        webhookActive={view.webhookActive}
        chooserOptions={view.chooserOptions}
        addOpen={view.addOpen}
        setAddOpen={view.setAddOpen}
        selectSource={view.selectSource}
      />

      <AnimeListSourcesSection />

      <LetterboxdImportSection
        file={view.file}
        dragging={view.dragging}
        busy={view.busy}
        progress={view.progress}
        include={view.include}
        importMsg={view.importMsg}
        importOk={view.importOk}
        importFailed={view.importFailed}
        isCsv={view.isCsv}
        inputRef={view.inputRef}
        onInputChange={view.onInputChange}
        onDrop={view.onDrop}
        setDragging={view.setDragging}
        toggleKind={view.toggleKind}
        onImport={view.onImport}
        clearFile={view.clearFile}
      />
    </>
  );
};
