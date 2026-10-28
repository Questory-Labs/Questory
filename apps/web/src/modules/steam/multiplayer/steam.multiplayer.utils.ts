import type { MultiplayerPlanGame } from "@questorylabs/shared";
import { formatMoney } from "@/lib/money";

export type PlanBadgeTone = "ok" | "warn" | "music" | "read" | "faint";

export type PlanOwnershipSummary = {
  partySize: number;
  ownedCount: number;
  owners: string;
  badge: string;
  tone: PlanBadgeTone;
};

const formatPrice = (g: MultiplayerPlanGame) => {
  if (g.currentPrice == null) return null;
  if (g.currentPrice === 0) return "Free";
  return formatMoney(g.currentPrice, g.currency);
};

const listNames = (names: string[]) =>
  `${names.slice(0, 2).join(", ")}${names.length > 2 ? ` +${names.length - 2}` : ""}`;

export const planOwnership = (
  g: MultiplayerPlanGame,
  friendCount: number,
): PlanOwnershipSummary => {
  const partySize = friendCount + 1;
  const ownedCount = Math.min(
    partySize,
    (g.ownedByYou ? 1 : 0) + g.ownedByFriends.length,
  );
  const price = formatPrice(g);
  const suggested = g.isSuggested ? "Suggested · " : "";

  if (g.ownership === "shared") {
    return {
      partySize,
      ownedCount: partySize,
      owners: partySize > 1 ? `Owned by all ${partySize}` : "In your library",
      badge: `${suggested}Everyone owns it`,
      tone: "ok",
    };
  }

  if (g.ownership === "unowned") {
    return {
      partySize,
      ownedCount: 0,
      owners: "Owned by none, fits the group",
      badge: g.isSuggested
        ? `Suggested${price ? ` · ${price}` : ""}`
        : "Not owned",
      tone: g.isSuggested ? "read" : "faint",
    };
  }

  const missing = g.missingFriends.length
    ? ` · missing ${listNames(g.missingFriends)}`
    : "";

  if (!g.ownedByYou && ownedCount === partySize - 1) {
    return {
      partySize,
      ownedCount,
      owners: `Everyone but you${price ? ` · ${price}` : ""}`,
      badge: `${suggested}You don’t own it`,
      tone: "music",
    };
  }

  return {
    partySize,
    ownedCount,
    owners: `Owned by ${ownedCount} of ${partySize}${
      g.ownedByYou ? "" : " · not you"
    }${missing}`,
    badge: `${suggested}Partial`,
    tone: "warn",
  };
};

export const planMetaLine = (g: MultiplayerPlanGame) => {
  const players =
    g.minPlayers != null && g.maxPlayers != null
      ? g.minPlayers === g.maxPlayers
        ? `${g.maxPlayers} players`
        : `${g.minPlayers}–${g.maxPlayers} players`
      : null;
  return [
    players,
    g.releaseYear ? String(g.releaseYear) : null,
    g.genres.slice(0, 2).join(", ") || null,
    g.reviewScore != null ? `★ ${g.reviewScore}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
};

export const parseFriendsParam = (raw: string | null | undefined) =>
  (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{1,20}$/.test(s))
    .slice(0, 16);
