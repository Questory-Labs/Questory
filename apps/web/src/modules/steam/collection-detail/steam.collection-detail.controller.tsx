"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import { api } from "@/lib/api";
import { GAME_GRID_PAGE_SIZE } from "@/lib/pagination";
import type { CollectionDetailResponse } from "./steam.collection-detail.types";

export const CollectionDetailController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ id: string }>();
  const [page, setPage] = useState(1);

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

  return cloneElements(children, { collection, page, setPage });
};
