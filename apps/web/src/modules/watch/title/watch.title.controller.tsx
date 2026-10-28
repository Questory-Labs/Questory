"use client";

import { useState, type PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { WatchCatalogLog, WatchCatalogLogResult, WatchTitleDetail } from "@questorylabs/shared";
import { watchFetch } from "@/lib/watch";
import { WATCH_TITLE_TOUCHES } from "./watch.title.utils";

export const WatchTitleController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const store = useStore();
  const [markMessage, setMarkMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

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

  const mark = useAction({
    run: (body: WatchCatalogLog) =>
      watchFetch<WatchCatalogLogResult>("/catalog/log", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (_result, body) => {
      setMarkMessage({
        tone: "ok",
        text:
          body.type === "show"
            ? `Marked S${body.seasonNumber} E${body.episodeNumber} watched.`
            : "Logged a watch for today.",
      });
      store.touch([["watch-title", id], ...WATCH_TITLE_TOUCHES]);
    },
    onError: (err) => setMarkMessage({ tone: "error", text: err.message || "Could not log that watch." }),
  });

  return cloneElements(children, {
    id,
    detail,
    saveBusy: save.busy,
    onSave: async (values: { displayName: string; coverUrl: string }) => {
      await save.submitAsync(values);
    },
    markBusy: mark.busy,
    markMessage,
    onMark: (body: WatchCatalogLog) => {
      setMarkMessage(null);
      mark.submit(body);
    },
  });
};
