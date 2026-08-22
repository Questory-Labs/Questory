"use client";

import { useParams } from "next/navigation";
import { useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { MusicArtistDetail, MusicRange } from "@questorylabs/shared";
import { musicFetch } from "@/lib/music";

export const MusicArtistController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [range, setRange] = useState<MusicRange>("all");

  const detail = useResource({
    id: ["music-artist", id, range],
    load: () =>
      musicFetch<MusicArtistDetail>(`/analytics/artists/${id}?range=${range}`),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: {
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) =>
      musicFetch(`/corrections/artists/${id}`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      store.touch(["music-artist", id]);
      store.touch(["music-recent"]);
    },
  });

  return cloneElements(children, {
    id,
    range,
    setRange,
    detail,
    saveBusy: save.busy,
    onSave: async (values: {
      artists?: Array<{ id?: string; name: string }>;
      displayName?: string | null;
    }) => {
      await save.submitAsync(values);
    },
  });
};
