import type { Collection } from "@questorylabs/shared";
import {
  COLLECTION_CLUSTER_PREFIX,
  type CollectionKind,
} from "./steam.collections.constants";

export const collectionKind = (
  c: Pick<Collection, "type" | "ruleKey">,
): CollectionKind => {
  if (c.type === "custom") return "custom";
  return c.ruleKey?.startsWith(COLLECTION_CLUSTER_PREFIX) ? "taste" : "smart";
};

export const splitCollections = (list: Collection[]) => ({
  shelves: list.filter((c) => collectionKind(c) !== "custom"),
  custom: list.filter((c) => collectionKind(c) === "custom"),
});
