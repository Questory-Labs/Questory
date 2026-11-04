import type { DealAlert, Store } from "@questorylabs/shared";

export const DEAL_LABELS: Record<DealAlert["reason"], string> = {
  target: "Target hit",
  historical_low: "Near low",
  strong_score: "Strong score",
};

export const WISHLIST_STORE_LABELS: Record<Store, string> = {
  steam: "Steam",
  epic: "Epic",
  gog: "GOG",
};

export const WISHLIST_DEAL_ALERT_LIMIT = 6;
export const WISHLIST_REC_LIMIT = 8;
export const WISHLIST_REASON_LIMIT = 2;
