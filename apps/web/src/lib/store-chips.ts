import type { Store } from "@questorylabs/shared";

export const STORE_CHIPS: { id: Store | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "steam", label: "Steam" },
  { id: "epic", label: "Epic" },
  { id: "gog", label: "GOG" },
];
