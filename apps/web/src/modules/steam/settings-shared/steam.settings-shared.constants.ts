export const SETTINGS_TABS = [
  { key: "profile", label: "Profile", href: "/settings/profile" },
  { key: "connections", label: "Connections", href: "/settings/connections" },
  { key: "stores", label: "Stores", href: "/settings/stores" },
] as const;

export type SettingsTabKey = (typeof SETTINGS_TABS)[number]["key"];

export const USER_SYNC_TICK_MS = 1_000;
