"use client";

import { api } from "@/lib/api";
import { fetchAllFriends } from "@/lib/friends";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import { useResource } from "@questorylabs/qhttp/react";
import type { MultiplayerPlanResponse } from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useMultiplayerPlanFilters } from "./steam.multiplayer.hooks";

export const MultiplayerController = ({ children }: PropsWithChildren) => {
  const friends = useResource({
    id: ["friends", "all"],
    load: fetchAllFriends,
  });
  const friendList = friends.value?.friends || [];
  const filters = useMultiplayerPlanFilters(friendList);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  const partyFriends = useMemo(
    () =>
      friendList
        .filter((f) => filters.selected.includes(f.steamId))
        .map((f) => ({
          steamId: f.steamId,
          personaName: f.personaName,
          avatarUrl: f.avatarUrl,
        })),
    [friendList, filters.selected],
  );

  const plan = useResource({
    id: ["multiplayer-plan", filters.body],
    load: () =>
      api<MultiplayerPlanResponse>("/multiplayer/plan", {
        method: "POST",
        body: JSON.stringify(filters.body),
      }),
  });

  useEffect(() => {
    setPage(1);
  }, [filters.body]);

  const games = plan.value?.games || [];
  const totalPages = Math.max(1, Math.ceil(games.length / GAME_GRID_PAGE_SIZE));
  const pageGames = useMemo(() => {
    const start = (page - 1) * GAME_GRID_PAGE_SIZE;
    return games.slice(start, start + GAME_GRID_PAGE_SIZE);
  }, [games, page]);

  return cloneElements(children, {
    friends,
    plan,
    partyFriends,
    pageGames,
    page,
    setPage,
    totalPages,
    selectedAppId,
    setSelectedAppId,
    filters,
  });
};
