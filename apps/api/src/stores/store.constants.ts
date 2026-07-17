export type StoreId = "steam" | "epic" | "gog";

export const STORES: StoreId[] = ["steam", "epic", "gog"];

/** ITAD numeric shop ids (overview/history filters). */
export const ITAD_SHOP_IDS: Record<StoreId, number> = {
  steam: 61,
  epic: 36,
  gog: 35,
};

export function isStoreId(value: string): value is StoreId {
  return value === "steam" || value === "epic" || value === "gog";
}

export function normalizeTitle(name: string): string {
  return name
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function storeUrl(store: StoreId, externalId: string): string {
  switch (store) {
    case "steam":
      return `https://store.steampowered.com/app/${externalId}`;
    case "gog":
      return `https://www.gog.com/game/${externalId}`;
    case "epic":
      return `https://store.epicgames.com/p/${externalId}`;
    default:
      return "";
  }
}
