"use client";

import { useState, type PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type {
  GameDetail,
  LibraryEntry,
  LibraryUserStatus,
  PlaySessionPage,
} from "@questorylabs/shared";
import { api } from "@/lib/api";
import { LIBRARY_GAME_SESSIONS_PAGE_SIZE } from "@/lib/pagination";
import type { LibraryGameTab } from "./steam.library-game.constants";

export const LibraryGameController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;
  const store = useStore();
  const [tab, setTab] = useState<LibraryGameTab>("overview");

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

  const setStatus = useAction({
    run: (status: LibraryUserStatus | null) =>
      api(`/library/${encodeURIComponent(gameId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      store.touch(["library-entry", gameId]);
      store.touch(["game-detail"]);
      store.touch(["library"]);
    },
  });

  return cloneElements(children, {
    gameId,
    entry,
    detail,
    sessions,
    setStatus,
    tab,
    setTab,
  });
};
