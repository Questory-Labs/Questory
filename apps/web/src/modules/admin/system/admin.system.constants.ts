import type { SystemTab } from "./admin.system.types";

export const SYSTEM_TABS = ["settings", "migrations"] as const;

export const SYSTEM_TAB_OPTIONS: { value: SystemTab; label: string }[] = [
  { value: "settings", label: "Settings" },
  { value: "migrations", label: "Migrations" },
];
