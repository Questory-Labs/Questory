"use client";

import { useMemo, useState, type PropsWithChildren } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { Store } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { LIBRARY_PAGE_SIZE } from "@/lib/pagination";
import { useSyncJobs } from "@/hooks/useSyncJobs";
import type { LibraryListResponse } from "./steam.library.types";

export const LibraryController = ({ children }: PropsWithChildren) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeParam = searchParams.get("store");
  const activeStore =
    storeParam === "steam" || storeParam === "epic" || storeParam === "gog"
      ? storeParam
      : "all";

  const [q, setQ] = useState("");
  const [genre, setGenre] = useState("");
  const [unplayed, setUnplayed] = useState(false);
  const [multiplayer, setMultiplayer] = useState(false);
  const [deck, setDeck] = useState(false);
  const [page, setPage] = useState(1);

  const setStore = (store: Store | "all") => {
    setPage(1);
    const p = new URLSearchParams(searchParams.toString());
    if (store === "all") p.delete("store");
    else p.set("store", store);
    const qs = p.toString();
    router.replace(qs ? `/library?${qs}` : "/library");
  };

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (genre) p.set("genre", genre);
    if (unplayed) p.set("unplayed", "true");
    if (multiplayer) p.set("multiplayer", "true");
    if (deck) p.set("deck", "true");
    if (activeStore !== "all") p.set("store", activeStore);
    p.set("page", String(page));
    p.set("pageSize", String(LIBRARY_PAGE_SIZE));
    return p.toString();
  }, [q, genre, unplayed, multiplayer, deck, activeStore, page]);

  const sync = useSyncJobs();
  const library = useResource({
    id: ["library", params],
    load: () => api<LibraryListResponse>(`/library?${params}`),
    refreshEvery: sync.active ? 3_000 : false,
  });

  return cloneElements(children, {
    library,
    sync,
    activeStore,
    setStore,
    q,
    setQ,
    genre,
    setGenre,
    unplayed,
    setUnplayed,
    multiplayer,
    setMultiplayer,
    deck,
    setDeck,
    page,
    setPage,
  });
};
