"use client";

import { api } from "@/lib/api";
import { WISHLIST_PAGE_SIZE } from "@/lib/pagination";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import type { DealAlert, Store } from "@questorylabs/shared";
import { cloneElements } from "@questorylabs/ui";
import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { useWishlistEdit } from "./steam.wishlist.hooks";
import type { Recommendation, WishlistResponse } from "./steam.wishlist.types";

export const WishlistController = ({ children }: PropsWithChildren) => {
  const store = useStore();
  const [storeFilter, setStoreFilter] = useState<Store | "all">("all");
  const [page, setPage] = useState(1);
  const { editing, target, setTarget, startEdit, stopEdit } = useWishlistEdit();

  useEffect(() => {
    setPage(1);
  }, [storeFilter]);

  const listPath = useMemo(() => {
    const p = new URLSearchParams();
    if (storeFilter !== "all") p.set("store", storeFilter);
    p.set("page", String(page));
    p.set("pageSize", String(WISHLIST_PAGE_SIZE));
    return `/wishlist?${p.toString()}`;
  }, [storeFilter, page]);

  const list = useResource({
    id: ["wishlist", storeFilter, page],
    load: () => api<WishlistResponse>(listPath),
  });
  const recommendations = useResource({
    id: ["wishlist-recommendations"],
    load: () => api<Recommendation[]>("/wishlist/recommendations"),
  });
  const deals = useResource({
    id: ["wishlist-deals"],
    load: () => api<DealAlert[]>("/wishlist/deals"),
  });

  const update = useAction({
    run: ({
      store: itemStore,
      externalId,
      targetPrice,
    }: {
      store: Store;
      externalId: string;
      targetPrice: number | null;
    }) =>
      api(`/wishlist/${itemStore}/${externalId}`, {
        method: "PATCH",
        body: JSON.stringify({ targetPrice }),
      }),
    onSuccess: () => {
      store.touch(["wishlist"]);
      store.touch(["wishlist-recommendations"]);
      store.touch(["wishlist-deals"]);
    },
  });

  const filteredRecs = (recommendations.value || []).filter(
    (i) => storeFilter === "all" || i.store === storeFilter,
  );
  const filteredDeals = (deals.value || []).filter(
    (d) => storeFilter === "all" || d.store === storeFilter,
  );

  return cloneElements(children, {
    list,
    recommendations,
    deals,
    storeFilter,
    setStoreFilter,
    page,
    setPage,
    editing,
    target,
    setTarget,
    startEdit,
    stopEdit,
    update,
    filteredRecs,
    filteredDeals,
  });
};
