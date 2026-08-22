"use client";

import type { PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { GameDetail, LibraryEntry } from "@questorylabs/shared";
import { api } from "@/lib/api";

export const LibraryGameController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  const entry = useResource({
    id: ["library-entry", gameId],
    load: () => api<LibraryEntry>(`/library/${gameId}`),
    when: Boolean(gameId),
  });

  const appId = entry.value?.game.appId;
  const detail = useResource({
    id: ["game-detail", appId],
    load: () => api<GameDetail>(`/games/${appId}`),
    when: appId != null && appId > 0,
  });

  return cloneElements(children, { gameId, entry, detail });
};
