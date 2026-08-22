"use client";

import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { ReadTitleDetail } from "@questorylabs/shared";
import { readFetch } from "@/lib/read";
import type { PropsWithChildren } from "react";

export const ReadTitleController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();

  const detail = useResource({
    id: ["read-title", id],
    load: () => readFetch<ReadTitleDetail>(`/analytics/titles/${id}`),
    when: Boolean(id),
  });

  const save = useAction({
    run: (values: { displayName: string; coverUrl: string }) =>
      readFetch(`/catalog/titles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: values.displayName.trim() || null,
          coverUrl: values.coverUrl.trim() || null,
        }),
      }),
    onSuccess: () => {
      store.touch(["read-title", id]);
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
