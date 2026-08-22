"use client";

import type { Friend, MultiplayerPlanSort } from "@questorylabs/shared";
import { useMemo, useState } from "react";
import {
  YEAR_MAX,
  YEAR_MIN,
  type MultiplayerMode,
} from "./steam.multiplayer.constants";

export const useMultiplayerPlanFilters = (friendList: Friend[]) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [friendFilter, setFriendFilter] = useState("");
  const [minPlayers, setMinPlayers] = useState(2);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [minYear, setMinYear] = useState(YEAR_MIN);
  const [maxYear, setMaxYear] = useState(YEAR_MAX);
  const [mode, setMode] = useState<MultiplayerMode>("");
  const [genre, setGenre] = useState("");
  const [sortBy, setSortBy] = useState<MultiplayerPlanSort>("popularity");
  const [suggested, setSuggested] = useState(false);
  const [strictLibraryMatching, setStrictLibraryMatching] = useState(false);

  const filteredFriends = useMemo(() => {
    const q = friendFilter.trim().toLowerCase();
    if (!q) return friendList;
    return friendList.filter(
      (f) =>
        f.personaName.toLowerCase().includes(q) || f.steamId.includes(q),
    );
  }, [friendList, friendFilter]);

  const body = useMemo(
    () => ({
      friendSteamIds: selected,
      minPlayers,
      maxPlayers,
      minYear,
      maxYear,
      mode: mode || undefined,
      genre: genre || undefined,
      sortBy,
      suggested,
      strictLibraryMatching,
    }),
    [
      selected,
      minPlayers,
      maxPlayers,
      minYear,
      maxYear,
      mode,
      genre,
      sortBy,
      suggested,
      strictLibraryMatching,
    ],
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return {
    selected,
    friendFilter,
    setFriendFilter,
    minPlayers,
    setMinPlayers,
    maxPlayers,
    setMaxPlayers,
    minYear,
    setMinYear,
    maxYear,
    setMaxYear,
    mode,
    setMode,
    genre,
    setGenre,
    sortBy,
    setSortBy,
    suggested,
    setSuggested,
    strictLibraryMatching,
    setStrictLibraryMatching,
    filteredFriends,
    body,
    toggle,
  };
};
