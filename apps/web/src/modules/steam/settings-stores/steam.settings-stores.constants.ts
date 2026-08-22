import type { Store, StoreAccountStatus } from "@questorylabs/shared";

export const STORE_COPY: Record<Store, { title: string; blurb: string }> = {
  steam: {
    title: "Steam",
    blurb:
      "Linked from Connections. Library, wishlist, friends, and prices sync from Steam.",
  },
  epic: {
    title: "Epic Games",
    blurb:
      "Store tags and filters are ready. Live library sync is coming later — Epic’s APIs are limited.",
  },
  gog: {
    title: "GOG",
    blurb:
      "Store tags and filters are ready. Live library sync is coming later — GOG auth and data access are limited.",
  },
};

export const STORE_STATUS_FALLBACK: StoreAccountStatus[] = [
  {
    store: "steam",
    connected: true,
    syncEnabled: true,
    status: "connected",
  },
  {
    store: "epic",
    connected: false,
    syncEnabled: false,
    status: "coming_later",
  },
  {
    store: "gog",
    connected: false,
    syncEnabled: false,
    status: "coming_later",
  },
];
