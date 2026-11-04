export type SystemTab = "settings" | "migrations";

export type AdminSystemViewProps = {
  tab: SystemTab;
  setTab: (next: SystemTab) => void;
};
