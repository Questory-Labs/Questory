import { useEffect, useMemo, useState } from "react";
import type { Friend } from "@questorylabs/shared";
import { normalizeSteamId } from "./steam.family.utils";

export const useFamilyImportSelection = (
  friends: Friend[],
  memberIds: Set<string>,
  remainingSlots = Number.POSITIVE_INFINITY,
) => {
  const [selected, setSelected] = useState(() => new Set<string>());
  const [filter, setFilter] = useState("");

  const memberIdSet = useMemo(() => {
    const next = new Set<string>();
    for (const id of memberIds) {
      const normalized = normalizeSteamId(id);
      if (normalized) next.add(normalized);
    }
    return next;
  }, [memberIds]);

  const importable = useMemo(() => {
    const list = friends.filter(
      (f) => !memberIdSet.has(normalizeSteamId(f.steamId)),
    );
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.personaName.toLowerCase().includes(q) || f.steamId.includes(q),
    );
  }, [friends, memberIdSet, filter]);

  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        const normalized = normalizeSteamId(id);
        if (memberIdSet.has(normalized)) continue;
        if (next.size >= remainingSlots) continue;
        next.add(normalized);
      }
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) {
        return prev;
      }
      return next;
    });
  }, [memberIdSet, remainingSlots]);

  const toggle = (id: string) => {
    const normalized = normalizeSteamId(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(normalized)) {
        next.delete(normalized);
        return next;
      }
      if (next.size >= remainingSlots) return prev;
      next.add(normalized);
      return next;
    });
  };

  const toggleAll = () => {
    const ids = importable.map((f) => normalizeSteamId(f.steamId));
    const selectedVisible = ids.filter((id) => selected.has(id));
    const filled =
      remainingSlots < Number.POSITIVE_INFINITY &&
      selected.size >= remainingSlots &&
      selectedVisible.length > 0;
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected || filled) {
        for (const id of ids) next.delete(id);
        return next;
      }
      for (const id of ids) {
        if (next.size >= remainingSlots) break;
        next.add(id);
      }
      return next;
    });
  };

  const reset = () => {
    setSelected(new Set());
    setFilter("");
  };

  return {
    selected,
    filter,
    setFilter,
    importable,
    toggle,
    toggleAll,
    reset,
  };
};
