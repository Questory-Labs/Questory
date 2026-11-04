"use client";

import { useResource } from "@questorylabs/qhttp/react";
import type { FriendCompare } from "@questorylabs/shared";
import { api } from "@/lib/api";

export const useFriendCompare = (steamId: string | null | undefined) =>
  useResource({
    id: ["friend-compare", steamId ?? ""],
    load: () =>
      api<FriendCompare>(`/friends/${encodeURIComponent(steamId ?? "")}/compare`),
    when: Boolean(steamId),
  });
