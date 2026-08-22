"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MusicCorrectionEdit } from "@/components/music/MusicCorrectionEdit";
import { MusicChip } from "@/components/music/MusicChip";
import { MusicCover } from "@/components/music/MusicCover";
import { MusicRangePicker } from "@/components/music/MusicRangePicker";
import {
  PageHeader,
  ResourceStatus,
  SkeletonDetailHeader,
  StateMessage,
} from "@/components/ui";
import { displayLabel } from "@/lib/display-label";
import { formatListenDate } from "@/lib/music";
import { MoodTagCloud } from "./components/MoodTagCloud";
import { TopList } from "./components/TopList";
import type { MusicArtistViewProps } from "./music.artist.types";

export const MusicArtistView = (props: Record<string, unknown>) => {
  const { id, range, setRange, detail, saveBusy, onSave } =
    props as MusicArtistViewProps;

  const a = detail.value?.artist;
  const title = a ? displayLabel(a.userDisplayName, a.name) : "Artist";

  const topTrackItems = useMemo(
    () =>
      detail.value?.topTracks.map((t) => ({
        key: t.id,
        href: `/music/tracks/${t.id}`,
        label: t.title,
        sub: t.releaseTitle,
        count: t.count,
        imageUrl: t.imageUrl,
      })) ?? [],
    [detail.value?.topTracks],
  );

  const topAlbumItems = useMemo(
    () =>
      detail.value?.topAlbums.map((t) => ({
        key: t.id,
        href: `/music/albums/${t.id}`,
        label: t.title,
        count: t.count,
        imageUrl: t.imageUrl,
      })) ?? [],
    [detail.value?.topAlbums],
  );

  return (
    <>
      <PageHeader
        eyebrow="Artist"
        title={title}
        description={
          detail.value
            ? `${detail.value.listenCount} listens in range · first ${formatListenDate(detail.value.firstListenAt)} · latest ${formatListenDate(detail.value.latestListenAt)}`
            : undefined
        }
        actions={
          <>
            <MusicRangePicker value={range} onChange={setRange} includeAll />
            {a ? (
              <MusicCorrectionEdit
                kind="artist"
                entityId={id}
                saving={saveBusy}
                onSave={onSave}
              />
            ) : null}
          </>
        }
      />

      <ResourceStatus
        failed={detail.failed}
        empty={detail.empty}
        loading={<SkeletonDetailHeader />}
        error={<StateMessage variant="error">Artist not found.</StateMessage>}
      >
        {detail.value && a ? (
          <>
            <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
              <MusicCover src={a.imageUrl} alt={title} size="lg" />
              <div>
                {a.userDisplayName && a.userDisplayName !== a.name ? (
                  <p className="text-sm text-[var(--muted)]">{a.name}</p>
                ) : null}

                {a.genres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {a.genres.map((g) => (
                      <MusicChip key={g}>{g}</MusicChip>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {detail.value.topMoods.length > 0 ? (
              <MoodTagCloud moods={detail.value.topMoods} />
            ) : null}

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <TopList
                title="Top songs"
                empty="No listens in this range."
                items={topTrackItems}
                moreHref="/music/charts?kind=tracks"
                moreLabel="View top tracks"
              />
              <TopList
                title="Top albums"
                empty="No album listens in this range."
                items={topAlbumItems}
                moreHref="/music/charts?kind=albums"
                moreLabel="View top albums"
              />
            </div>

            <p className="mt-8 text-sm text-[var(--muted)]">
              <Link
                href="/music/charts?kind=artists"
                className="hover:text-[var(--accent)]"
              >
                ← Back to charts
              </Link>
            </p>
          </>
        ) : null}
      </ResourceStatus>
    </>
  );
};
