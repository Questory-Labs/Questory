"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { FriendsListResponse } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { FRIENDS_PAGE_SIZE } from "@/lib/pagination";
import { useFriendCompare } from "../friend-compare/steam.friend-compare.hooks";
import { FRIENDS_SEARCH_DEBOUNCE_MS } from "./steam.friends.constants";

export const FriendsController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ steamId?: string }>();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedSteamId, setSelectedSteamId] = useState<string | null>(
    params?.steamId ?? null,
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, FRIENDS_SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const friends = useResource({
    id: ["friends", page, search],
    load: () => {
      const qs = new URLSearchParams({
        page: String(page),
        pageSize: String(FRIENDS_PAGE_SIZE),
      });
      if (search) qs.set("q", search);
      return api<FriendsListResponse>(`/friends?${qs.toString()}`);
    },
  });

  const list = friends.value?.friends ?? [];
  const fallbackSteamId =
    list.find((f) => (f.personaState ?? 0) > 0)?.steamId ??
    list[0]?.steamId ??
    null;
  const activeSteamId = selectedSteamId ?? fallbackSteamId;
  const compare = useFriendCompare(activeSteamId);

  const selectFriend = (steamId: string) => {
    setSelectedSteamId(steamId);
    window.history.replaceState(null, "", `/friends/${steamId}`);
  };

  return cloneElements(children, {
    friends,
    page,
    setPage,
    query,
    setQuery,
    search,
    activeSteamId,
    selectFriend,
    compare,
  });
};
