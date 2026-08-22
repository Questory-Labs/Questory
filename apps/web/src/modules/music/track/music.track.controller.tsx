"use client";

import { useParams } from "next/navigation";
import { useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  MusicHeatmap,
  MusicRange,
  MusicTimeBucket,
  MusicTrackDetail,
  MusicTrackListenPage,
} from "@questorylabs/shared";
import { withTz } from "@/lib/dates";
import { musicFetch } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";

export const MusicTrackController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [range, setRange] = useState<MusicRange>("all");
  const [page, setPage] = useState(1);

  const detail = useResource({
    id: ["music-track", id, range],
    load: () =>
      musicFetch<MusicTrackDetail>(
        withTz(`/analytics/tracks/${id}?range=${range}`),
      ),
    when: Boolean(id),
  });

  const listens = useResource({
    id: ["music-track-listens", id, range, page],
    load: () =>
      musicFetch<MusicTrackListenPage>(
        `/analytics/tracks/${id}/listens?range=${range}&page=${page}&pageSize=${MUSIC_DETAIL_LISTENS_PAGE_SIZE}`,
      ),
    when: Boolean(id),
  });

  const hourSeries = useResource({
    id: ["music-track-hour", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/tracks/${id}/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const dowSeries = useResource({
    id: ["music-track-dow", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/tracks/${id}/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const heatmap = useResource({
    id: ["music-track-heatmap", id, range],
    load: () =>
      musicFetch<MusicHeatmap>(
        withTz(`/analytics/tracks/${id}/heatmap?range=${range}`),
      ),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: {
      trackTitle?: string;
      albumTitle?: string | null;
      artists?: Array<{ id?: string; name: string }>;
      artistName?: string;
      displayName?: string | null;
    }) =>
      musicFetch<{ ok: boolean; reassigned?: boolean; trackId?: string }>(
        `/corrections/tracks/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(values),
        },
      ),
    onSuccess: (result) => {
      store.touch(["music-track"]);
      store.touch(["music-track-listens"]);
      store.touch(["music-recent"]);
      if (result?.trackId && result.trackId !== id) {
        window.location.href = `/music/tracks/${result.trackId}`;
      }
    },
  });

  const merge = useAction({
    run: (targetTrackId: string) =>
      musicFetch<{ ok: boolean; trackId: string; mergedListenCount: number }>(
        `/corrections/tracks/${id}/merge`,
        {
          method: "POST",
          body: JSON.stringify({ targetTrackId }),
        },
      ),
    onSuccess: (result) => {
      store.touch(["music-track"]);
      store.touch(["music-track-listens"]);
      store.touch(["music-recent"]);
      if (result.trackId) {
        window.location.href = `/music/tracks/${result.trackId}`;
      }
    },
  });

  const onRangeChange = (next: MusicRange) => {
    setRange(next);
    setPage(1);
  };

  return cloneElements(children, {
    id,
    range,
    onRangeChange,
    page,
    setPage,
    detail,
    listens,
    hourSeries,
    dowSeries,
    heatmap,
    saveBusy: save.busy,
    mergeBusy: merge.busy,
    onSave: async (
      values: {
        trackTitle?: string;
        albumTitle?: string | null;
        artists?: Array<{ id?: string; name: string }>;
        artistName?: string;
        displayName?: string | null;
      },
    ) => {
      const result = await save.submitAsync(values);
      return result;
    },
    onMerge: async (targetTrackId: string) => {
      const result = await merge.submitAsync(targetTrackId);
      return result;
    },
    onSaved: () => {
      store.touch(["music-track", id]);
    },
  });
};
