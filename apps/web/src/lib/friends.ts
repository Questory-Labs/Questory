import { api } from "@/lib/api";
import type { FriendsListResponse } from "@questorylabs/shared";

const FRIENDS_FETCH_PAGE_SIZE = 100;

/** Load every friend for pickers (multiplayer, family import). */
export async function fetchAllFriends(): Promise<FriendsListResponse> {
  const first = await api<FriendsListResponse>(
    `/friends?page=1&pageSize=${FRIENDS_FETCH_PAGE_SIZE}`,
  );
  if (first.friends.length >= first.total) return first;

  const extraPages = Math.ceil(first.total / FRIENDS_FETCH_PAGE_SIZE) - 1;
  const rest = await Promise.all(
    Array.from({ length: extraPages }, (_, i) =>
      api<FriendsListResponse>(
        `/friends?page=${i + 2}&pageSize=${FRIENDS_FETCH_PAGE_SIZE}`,
      ),
    ),
  );

  return {
    ...first,
    friends: [...first.friends, ...rest.flatMap((r) => r.friends)],
    page: 1,
    pageSize: first.total,
  };
}
