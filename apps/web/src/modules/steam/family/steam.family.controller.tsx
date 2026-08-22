"use client";

import { useMemo, useState, type PropsWithChildren } from "react";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { FamilyInsights, FamilyLibrary } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { fetchAllFriends } from "@/lib/friends";
import { FAMILY_LIBRARY_PAGE_SIZE } from "@/lib/pagination";
import { useFamilyImportSelection } from "./steam.family.hooks";
import { parseApiError } from "./steam.family.utils";

export const FamilyController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [steamId, setSteamId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [activeMember, setActiveMember] = useState("all");
  const [gameSearch, setGameSearch] = useState("");
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [conflictsPage, setConflictsPage] = useState(1);

  const insights = useResource({
    id: ["family-insights"],
    load: () => api<FamilyInsights>("/family/insights"),
  });

  const libraryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (activeMember !== "all") p.set("memberSteamId", activeMember);
    if (gameSearch.trim()) p.set("q", gameSearch.trim());
    p.set("page", String(page));
    p.set("pageSize", String(FAMILY_LIBRARY_PAGE_SIZE));
    return p.toString();
  }, [activeMember, gameSearch, page]);

  const library = useResource({
    id: ["family-library", libraryParams],
    load: () => api<FamilyLibrary>(`/family/library?${libraryParams}`),
  });

  const conflictsParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("overlapOnly", "true");
    p.set("page", String(conflictsPage));
    p.set("pageSize", String(FAMILY_LIBRARY_PAGE_SIZE));
    return p.toString();
  }, [conflictsPage]);

  const conflicts = useResource({
    id: ["family-library-conflicts", conflictsParams],
    load: () => api<FamilyLibrary>(`/family/library?${conflictsParams}`),
  });

  const friends = useResource({
    id: ["friends", "all"],
    load: fetchAllFriends,
    when: showImport,
  });

  const members = insights.value?.members || library.value?.members || [];
  const memberIds = useMemo(
    () => new Set(members.map((m) => m.steamId)),
    [members],
  );

  const {
    selected,
    filter: importFilter,
    setFilter: setImportFilter,
    importable,
    toggle,
    toggleAll,
    reset,
  } = useFamilyImportSelection(friends.value?.friends || [], memberIds);

  const invalidateFamily = () => {
    store.touch(["family-insights"]);
    store.touch(["family-library"]);
  };

  const add = useAction({
    run: () =>
      api("/family/members", {
        method: "POST",
        body: JSON.stringify({ steamId: steamId.trim() }),
      }),
    onSuccess: () => {
      setSteamId("");
      setAddError(null);
      invalidateFamily();
    },
    onError: (err: Error) => setAddError(parseApiError(err)),
  });

  const importFriends = useAction({
    run: (steamIds: string[]) =>
      api<{ added: number; skipped: number }>("/family/members/import", {
        method: "POST",
        body: JSON.stringify({ steamIds }),
      }),
    onSuccess: () => {
      reset();
      setShowImport(false);
      setAddError(null);
      invalidateFamily();
    },
    onError: (err: Error) => setAddError(parseApiError(err)),
  });

  return cloneElements(children, {
    insights,
    library,
    conflicts,
    friends,
    members,
    steamId,
    setSteamId: (value: string) => {
      setSteamId(value);
      setAddError(null);
    },
    addError,
    addBusy: add.busy,
    onAdd: () => add.submit(),
    showImport,
    onToggleImport: () => setShowImport((v) => !v),
    importable,
    selected,
    importFilter,
    setImportFilter,
    toggle,
    toggleAll,
    importBusy: importFriends.busy,
    onImportSelected: () => importFriends.submit([...selected]),
    activeMember,
    setActiveMember: (id: string) => {
      setActiveMember(id);
      setPage(1);
    },
    gameSearch,
    setGameSearch: (value: string) => {
      setGameSearch(value);
      setPage(1);
    },
    page,
    setPage,
    conflictsPage,
    setConflictsPage,
    selectedAppId,
    setSelectedAppId,
  });
};
