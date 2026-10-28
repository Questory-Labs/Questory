import type { FriendCompare } from "@questorylabs/shared";

export const tasteOverlapPercent = (
  d: Pick<FriendCompare, "commonGames" | "uniqueToYou" | "uniqueToFriend">,
) => {
  const union = d.commonGames + d.uniqueToYou + d.uniqueToFriend;
  if (union <= 0) return 0;
  return Math.round((d.commonGames / union) * 100);
};

export const sharedGenresLine = (you: string[], friend: string[]) => {
  const theirs = new Set(friend.map((g) => g.toLowerCase()));
  const both = you.filter((g) => theirs.has(g.toLowerCase())).slice(0, 2);
  if (!both.length) return null;
  return `Both like ${both.join(" and ")}`;
};

export const minutesToHours = (minutes: number | undefined) =>
  Math.round(((minutes ?? 0) / 60) * 10) / 10;
