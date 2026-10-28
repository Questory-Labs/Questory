"use client";

import type { PropsWithChildren } from "react";
import { useParams } from "next/navigation";
import { cloneElements } from "@questorylabs/ui";
import { useFriendCompare } from "./steam.friend-compare.hooks";

export const FriendCompareController = ({ children }: PropsWithChildren) => {
  const params = useParams<{ steamId: string }>();
  const compare = useFriendCompare(params.steamId);

  return cloneElements(children, { compare });
};
