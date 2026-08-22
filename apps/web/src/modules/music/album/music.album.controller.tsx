"use client";

import { useParams } from "next/navigation";
import { useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  MusicAlbumDetail,
  MusicAlbumListenPage,
  MusicRange,
  MusicTimeBucket,
} from "@questorylabs/shared";
import { withTz } from "@/lib/dates";
import { musicFetch } from "@/lib/music";
import { MUSIC_DETAIL_LISTENS_PAGE_SIZE } from "@/lib/pagination";

export const MusicAlbumController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [range, setRange] = useState<MusicRange>("all");
  const [page, setPage] = useState(1);

  const detail = useResource({
    id: ["music-album", id, range],
    load: () =>
      musicFetch<MusicAlbumDetail>(
        withTz(`/analytics/albums/${id}?range=${range}`),
      ),
    when: Boolean(id),
  });

  const listens = useResource({
    id: ["music-album-listens", id, range, page],
    load: () =>
      musicFetch<MusicAlbumListenPage>(
        `/analytics/albums/${id}/listens?range=${range}&page=${page}&pageSize=${MUSIC_DETAIL_LISTENS_PAGE_SIZE}`,
      ),
    when: Boolean(id),
  });

  const hourSeries = useResource({
    id: ["music-album-hour", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/albums/${id}/timeseries?granularity=hourOfDay&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const dowSeries = useResource({
    id: ["music-album-dow", id, range],
    load: () =>
      musicFetch<MusicTimeBucket[]>(
        withTz(
          `/analytics/albums/${id}/timeseries?granularity=dayOfWeek&range=${range}`,
        ),
      ),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: {
      albumTitle?: string | null;
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) =>
      musicFetch(`/corrections/albums/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      store.touch(["music-album", id]);
      store.touch(["music-recent"]);
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
    saveBusy: save.busy,
    onSave: async (values: {
      albumTitle?: string | null;
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) => {
      await save.submitAsync(values);
    },
  });
};
