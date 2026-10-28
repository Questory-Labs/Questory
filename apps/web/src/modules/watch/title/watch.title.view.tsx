"use client";

import Link from "next/link";
import { EntityMetadataEdit } from "@/components/EntityMetadataEdit";
import { ResourceStatus, SkeletonDetailHeader, StateMessage } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { displayLabel } from "@/lib/display-label";
import { ShelfRankList } from "@/modules/media/shelf/components/ShelfRankList";
import { ShelfSection } from "@/modules/media/shelf/components/ShelfSection";
import { episodeCode } from "../home/watch.home.utils";
import { SeasonEpisodes } from "./components/SeasonEpisodes";
import { WatchTitleHero } from "./components/WatchTitleHero";
import { WatchTitleTimeline } from "./components/WatchTitleTimeline";
import type { WatchTitleViewProps } from "./watch.title.types";

export const WatchTitleView = (props: Record<string, unknown>) => {
  const { detail, saveBusy, onSave, markBusy, markMessage, onMark } = props as WatchTitleViewProps;
  const d = detail.value;
  const t = d?.title;
  const seasons = d?.seasons ?? [];

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="q-in flex min-h-9 items-center gap-2 text-[13px] text-[var(--muted)]">
          <Link href="/watch/history" className="no-underline hover:text-[var(--ink)]">
            ← Back to history
          </Link>
          {t ? (
            <>
              <span aria-hidden="true" className="text-[#5c5c61]">
                /
              </span>
              <span>{displayLabel(t.displayName, t.name)}</span>
            </>
          ) : null}
        </nav>
        {t ? (
          <EntityMetadataEdit
            initialDisplayName={t.displayName}
            initialCoverUrl={t.posterUrl}
            canonicalName={t.name}
            coverLabel="Poster URL"
            saving={saveBusy}
            onSave={onSave}
          />
        ) : null}
      </div>

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Title not found.</StateMessage>}
      >
        {d && t ? (
          <>
            <WatchTitleHero d={d} markBusy={markBusy} markMessage={markMessage} onMark={onMark} />
            <div className="flex flex-wrap gap-3.5">
              {t.type !== "movie" && seasons.length ? <SeasonEpisodes seasons={seasons} /> : null}
              <WatchTitleTimeline d={d} />
            </div>
            {t.type !== "movie" && d.topEpisodes.length > 0 ? (
              <ShelfSection id="watch-top-episodes" title="Top episodes" className="q-in [--i:4]">
                <div className="mt-2">
                  <ShelfRankList
                    items={d.topEpisodes.map((ep) => ({
                      id: ep.id,
                      href: `/watch/titles/${t.id}`,
                      name: `${episodeCode(ep.seasonNumber, ep.episodeNumber)}${ep.name ? ` · ${ep.name}` : ""}`,
                      value: ep.count,
                    }))}
                  />
                </div>
              </ShelfSection>
            ) : null}
            <p className="m-0 px-1 font-mono text-xs text-[var(--muted)]">
              {d.eventCount} watches · first {formatDate(d.firstWatchAt)} · latest {formatDate(d.latestWatchAt)}
            </p>
          </>
        ) : null}
      </ResourceStatus>
    </div>
  );
};
