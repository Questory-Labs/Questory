"use client";

import type { PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { useResource } from "@questorylabs/qhttp/react";
import { cloneElements } from "@questorylabs/ui";
import type { FriendCompare } from "@questorylabs/shared";
import { api } from "@/lib/api";

export const FriendCompareController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ steamId: string }>();
  const compare = useResource({
    id: ["friend-compare", params.steamId],
    load: () => api<FriendCompare>(`/friends/${params.steamId}/compare`),
  });

  return cloneElements(children, { compare });
};
