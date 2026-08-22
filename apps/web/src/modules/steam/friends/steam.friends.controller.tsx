"use client";

import { useState, type PropsWithChildren } from "react";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { FriendsListResponse } from "@questorylabs/shared";
import { api } from "@/lib/api";
import { FRIENDS_PAGE_SIZE } from "@/lib/pagination";

export const FriendsController = ({ children }: PropsWithChildren) => {
  const [page, setPage] = useState(1);
  const friends = useResource({
    id: ["friends", page],
    load: () =>
      api<FriendsListResponse>(
        `/friends?page=${page}&pageSize=${FRIENDS_PAGE_SIZE}`,
      ),
  });

  return cloneElements(children, { friends, page, setPage });
};
