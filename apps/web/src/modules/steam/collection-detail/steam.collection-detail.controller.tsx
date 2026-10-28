"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAction, useResource, useStore } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import type {
  CollectionDetailResponse,
  CollectionEditInput,
} from "./steam.collection-detail.types";

export const CollectionDetailController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const store = useStore();
  const [page, setPage] = useState(1);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [params.id]);

  const collection = useResource({
    id: ["collection", params.id, page],
    load: () =>
      api<CollectionDetailResponse>(
        `/collections/${params.id}?page=${page}&pageSize=${GAME_GRID_PAGE_SIZE}`,
      ),
  });

  const update = useAction({
    run: (input: CollectionEditInput) =>
      api(`/collections/${encodeURIComponent(params.id)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      setEditOpen(false);
      store.touch(["collection", params.id]);
      store.touch(["collections"]);
    },
  });

  const remove = useAction({
    run: () =>
      api(`/collections/${encodeURIComponent(params.id)}`, { method: "DELETE" }),
    onSuccess: () => {
      setDeleteOpen(false);
      store.touch(["collections"]);
      router.push("/collections");
    },
  });

  return cloneElements(children, {
    collection,
    page,
    setPage,
    update,
    remove,
    editOpen,
    setEditOpen,
    deleteOpen,
    setDeleteOpen,
  });
};
