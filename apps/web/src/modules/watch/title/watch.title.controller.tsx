"use client";

import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { WatchTitleDetail } from "@questorylabs/shared";
import { watchFetch } from "@/lib/watch";
import type { PropsWithChildren } from "react";

export const WatchTitleController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();

  const detail = useResource({
    id: ["watch-title", id],
    load: () => watchFetch<WatchTitleDetail>(`/analytics/titles/${id}`),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: { displayName: string; coverUrl: string }) =>
      watchFetch(`/catalog/titles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: values.displayName.trim() || null,
          posterUrl: values.coverUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      store.touch(["watch-title", id]);
    },
  });

  return cloneElements(children, {
    id,
    detail,
    saveBusy: save.busy,
    onSave: async (values: { displayName: string; coverUrl: string }) => {
      await save.submitAsync(values);
    },
  });
};
