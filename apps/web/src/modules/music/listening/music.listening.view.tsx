"use client";

import { ListPager } from "@/components/ListPager";
import { NowPlayingPanel } from "@/components/music/NowPlayingPanel";
import {
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
  StateMessage,
} from "@/components/ui";
import { groupListensByDay } from "@/lib/music";
import { MUSIC_LISTENING_PAGE_SIZE } from "@/lib/pagination";
import { ListenDayGroup } from "./components/ListenDayGroup";
import type { MusicListeningViewProps } from "./music.listening.types";

export const MusicListeningView = (props: Record<string, unknown>) => {
  const { recent, playing, page, setPage } = props as MusicListeningViewProps;

  const total = recent.value?.total ?? 0;
  const pageSize = recent.value?.pageSize ?? MUSIC_LISTENING_PAGE_SIZE;
  const items = recent.value?.items ?? [];
  const dayGroups = groupListensByDay(items);
  const nowPlaying = playing.value?.track ?? null;

  return (
    <>
      <PageHeader
        title="Listening"
        description={
          total > 0 ? `${total.toLocaleString()} scrobbles` : "Recent scrobbles."
        }
      />

      {nowPlaying ? (
        <NowPlayingPanel track={nowPlaying} wrapperClassName="mb-6" />
      ) : null}

      <ResourceStatus
        failed={recent.failed}
        empty={recent.empty}
        loading={<SkeletonListRows />}
        error={
          <StateMessage variant="error">Could not load listens.</StateMessage>
        }
      >
        {items.length === 0 ? (
          <EmptyState
            title={nowPlaying ? "Waiting for first scrobble" : "No listens yet"}
            description={
              nowPlaying
                ? "Now playing is live. Completed listens appear here once multi-scrobbler submits them (usually when the track ends)."
                : "Configure multi-scrobbler or import history under Sources."
            }
          />
        ) : (
          <>
            <div className="space-y-6">
              {dayGroups.map((group) => (
                <ListenDayGroup key={group.dayKey} group={group} />
              ))}
            </div>
            <ListPager
              page={page}
              total={total}
              pageSize={pageSize}
              disabled={recent.refreshing}
              onPageChange={setPage}
            />
          </>
        )}
      </ResourceStatus>
    </>
  );
};
