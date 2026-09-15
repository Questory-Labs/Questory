"use client";

import type { PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { GameDetail, LibraryEntry, PlaySessionPage } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { LIBRARY_GAME_SESSIONS_PAGE_SIZE } from "@/lib/pagination";

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

  const sessions = useResource({
    id: ["play-sessions", "library-game", gameId],
    load: () =>
      api<PlaySessionPage>(
        `/play-sessions?gameId=${encodeURIComponent(gameId)}&page=1&pageSize=${LIBRARY_GAME_SESSIONS_PAGE_SIZE}`,
      ),
    when: Boolean(gameId),
  });

  return cloneElements(children, { gameId, entry, detail, sessions });
};
