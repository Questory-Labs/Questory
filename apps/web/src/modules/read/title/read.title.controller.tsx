"use client";

import { useState, type PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { ReadProgressResult, ReadTitleDetail, ReadTitleTimeseries } from "@questorylabs/shared";
import { readFetch } from "@/lib/read";
import { READ_TITLE_WEEKS } from "./read.title.utils";

export const ReadTitleController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [logMessage, setLogMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const detail = useResource({
    id: ["read-title", id],
    load: () => readFetch<ReadTitleDetail>(`/analytics/titles/${id}`),
    when: Boolean(id),
  });

  const weeks = useResource({
    id: ["read-title-weeks", id],
    load: () =>
      readFetch<ReadTitleTimeseries>(
        `/analytics/titles/${id}/timeseries?granularity=week&weeks=${READ_TITLE_WEEKS}`,
      ),
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

  const logChapter = useAction({
    run: (chapter: number) =>
      readFetch<ReadProgressResult>(`/titles/${id}/progress`, {
        method: "POST",
        body: JSON.stringify({ chapter }),
      }),
    onSuccess: (result) => {
      setLogMessage({ tone: "ok", text: `Logged chapter ${result.chapter}.` });
      store.touch(["read-title", id]);
      store.touch(["read-title-weeks", id]);
      store.touch(["read-library"]);
      store.touch(["read-currently-reading"]);
    },
    onError: () => setLogMessage({ tone: "error", text: "Could not log that chapter." }),
  });

  return cloneElements(children, {
    id,
    detail,
    weeks,
    saveBusy: save.busy,
    onSave: async (values: { displayName: string; coverUrl: string }) => {
      await save.submitAsync(values);
    },
    logBusy: logChapter.busy,
    logMessage,
    onLogChapter: (chapter: number) => {
      setLogMessage(null);
      logChapter.submit(chapter);
    },
  });
};
