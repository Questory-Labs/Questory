import { useMemo, useState } from "react";
import type { Friend } from "@questorylabs/shared";

export const useFamilyImportSelection = (
  friends: Friend[],
  memberIds: Set<string>,
) => {
  const [selected, setSelected] = useState(() => new Set<string>());
  const [filter, setFilter] = useState("");

  const importable = useMemo(() => {
    const list = friends.filter((f) => !memberIds.has(f.steamId));
    const q = filter.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (f) =>
        f.personaName.toLowerCase().includes(q) || f.steamId.includes(q),
    );
  }, [friends, memberIds, filter]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    const ids = importable.map((f) => f.steamId);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
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
