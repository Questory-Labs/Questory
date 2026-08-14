/**
 * Steam GetFriendList order is typically oldest-first (friend_since), not the
 * alphabetical order the friends page uses. Slicing that list caches the same
 * private-profile friends every night and never reaches anyone else.
 *
 * Prefer family members, then never-cached, then the stalest cache.
 */
export function orderFriendsForLibraryCache<T extends { steamid: string }>(
  friends: T[],
  opts: {
    familySteamIds?: Iterable<string>;
    lastSyncedAtBySteamId?: Map<string, Date>;
  } = {},
): T[] {
  const family = new Set(opts.familySteamIds ?? []);
  const lastSynced = opts.lastSyncedAtBySteamId ?? new Map<string, Date>();

  return [...friends].sort((a, b) => {
    const aFamily = family.has(a.steamid) ? 0 : 1;
    const bFamily = family.has(b.steamid) ? 0 : 1;
    if (aFamily !== bFamily) return aFamily - bFamily;

    const aSynced = lastSynced.get(a.steamid)?.getTime() ?? 0;
    const bSynced = lastSynced.get(b.steamid)?.getTime() ?? 0;
    if (aSynced !== bSynced) return aSynced - bSynced;

    return a.steamid.localeCompare(b.steamid);
  });
}
