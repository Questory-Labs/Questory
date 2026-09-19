export function iso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function isoRequired(value: Date | string): string {
  return typeof value === "string" ? value : value.toISOString();
}

export type GameRef = {
  store: "steam" | "epic" | "gog";
  externalId: string;
  appId?: number | null;
  name?: string;
};

function asStore(store: string): "steam" | "epic" | "gog" | null {
  if (store === "epic" || store === "gog" || store === "steam") return store;
  return null;
}

export function gameRefFrom(
  game: {
    appId: number | null;
    name: string;
    storeListings?: Array<{ store: string; externalId: string }>;
  } | null
  | undefined,
): GameRef | null {
  if (!game) return null;
  const listing = game.storeListings?.[0];
  if (listing?.externalId) {
    const store = asStore(listing.store);
    if (store) {
      return {
        store,
        externalId: listing.externalId,
        appId: game.appId,
        name: game.name,
      };
    }
  }
  if (game.appId != null) {
    return {
      store: "steam",
      externalId: String(game.appId),
      appId: game.appId,
      name: game.name,
    };
  }
  return null;
}

export function yieldEventLoop() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}
