"use client";

import { useMemo } from "react";
import { ListPager } from "@/components/ListPager";
import { NowPlayingPanel } from "@/components/music/NowPlayingPanel";
import {
  Button,
  EmptyState,
  PageHeader,
  ResourceStatus,
  SkeletonListRows,
  StateMessage,
} from "@/components/ui";
import { groupListensByDay, listenDayKey } from "@/lib/music";
import { MUSIC_LISTENING_PAGE_SIZE } from "@/lib/pagination";
import { EqBars } from "../components/EqBars";
import { ListenDayGroup } from "./components/ListenDayGroup";
import { ListeningFilters } from "./components/ListeningFilters";
import { daySummary } from "./music.listening.utils";
import type { MusicListeningViewProps } from "./music.listening.types";

export const MusicListeningView = (props: Record<string, unknown>) => {
  const {
    recent,
    playing,
    page,
    setPage,
    items,
    query,
    setQuery,
    source,
    setSource,
    filtered,
    dayTotals,
    hasOlder,
    loadOlder,
    loadingOlder,
    olderFailed,
  } = props as MusicListeningViewProps;

  const total = recent.value?.total ?? 0;
  const pageSize = recent.value?.pageSize ?? MUSIC_LISTENING_PAGE_SIZE;
  const dayGroups = useMemo(() => groupListensByDay(items), [items]);
  const nowPlaying = playing.value?.track ?? null;
  const buckets = useMemo(
    () => new Map((dayTotals.value ?? []).map((b) => [b.key, b])),
    [dayTotals.value],
  );
  const today = buckets.get(listenDayKey(new Date().toISOString()))?.count ?? 0;

  return (
    <div className="flex flex-col gap-3.5">
      <PageHeader
        size="sm"
        eyebrow="Music · Listening"
        title={
          <>
            Every scrobble,{" "}
            <em className="font-serif font-normal text-[#f0c4cf]">newest first</em>
          </>
        }
        description={
          total > 0
            ? `${total.toLocaleString()} ${filtered ? "matching scrobbles" : "scrobbles"}`
            : "Recent scrobbles."
        }
        actions={
          <div className="flex items-end gap-3.5">
            <EqBars count={8} className="h-9" />
            <p className="flex flex-col leading-none">
              <span className="text-[34px] font-extralight tracking-[-0.04em]">
                {today.toLocaleString()}
              </span>
              <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
                <span
                  aria-hidden="true"
                  className="q-live h-[5px] w-[5px] rounded-full bg-[var(--ok)]"
                />
                listens today
              </span>
            </p>
          </div>
        }
      />

      {nowPlaying ? <NowPlayingPanel track={nowPlaying} /> : null}

      <ListeningFilters
        query={query}
        onQueryChange={setQuery}
        source={source}
        onSourceChange={setSource}
      />

      <ResourceStatus
        failed={recent.failed}
        empty={recent.empty}
        loading={<SkeletonListRows />}
        error={
          <StateMessage variant="error">Could not load listens.</StateMessage>
        }
      >
        {items.length === 0 ? (
          filtered ? (
            <EmptyState
              title="No listens match"
              description="Try another search or source."
            />
          ) : (
            <EmptyState
              title={nowPlaying ? "Waiting for first scrobble" : "No listens yet"}
              description={
                nowPlaying
                  ? "Now playing is live. Completed listens appear here once multi-scrobbler submits them (usually when the track ends)."
                  : "Configure multi-scrobbler or import history under Sources."
              }
            />
          )
        ) : (
          <>
            <div className="flex flex-col gap-3.5">
              {dayGroups.map((group, i) => (
                <ListenDayGroup
                  key={group.dayKey}
                  group={group}
                  index={i}
                  summary={
                    filtered
                      ? `${group.items.length} matching`
                      : daySummary(buckets.get(group.dayKey))
                  }
                />
              ))}
            </div>
            {hasOlder ? (
              <div className="flex flex-col items-center gap-2">
                <Button
                  variant="secondary"
                  className="q-in self-center"
                  onClick={loadOlder}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? "Loading…" : "Load older listens"}
                </Button>
                {olderFailed ? (
                  <StateMessage variant="error">Could not load older listens.</StateMessage>
                ) : null}
              </div>
            ) : null}
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
    </div>
  );
};
