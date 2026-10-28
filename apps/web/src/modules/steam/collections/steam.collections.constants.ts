export const COLLECTION_CLUSTER_PREFIX = "cluster:";

export const COLLECTION_KIND_LABELS = {
  smart: "Smart shelf",
  taste: "Taste group",
  custom: "Custom list",
} as const;

export type CollectionKind = keyof typeof COLLECTION_KIND_LABELS;

export const COLLECTION_FAN_SIZE = 4;

export const COLLECTION_COLORS = [
  "#e6c27a",
  "#5fd38a",
  "#7aa7e6",
  "#d17ae6",
  "#e67a7a",
  "#bdbdc2",
] as const;
