import type { Friend } from "@questorylabs/shared";
import { formatRelativePlayed } from "@/lib/dates";

export type FriendPresenceTone = "online" | "away" | "offline";

export type FriendPresenceInfo = {
  label: string;
  tone: FriendPresenceTone;
  live: boolean;
};

const AWAY_STATES: Record<number, string> = {
  2: "Busy",
  3: "Away",
  4: "Snooze",
};

export const friendPresence = (
  friend: Pick<
    Friend,
    "personaState" | "currentGameName" | "lastLogoffAt"
  >,
  now = new Date(),
): FriendPresenceInfo | null => {
  const state = friend.personaState;
  if (typeof state === "number" && state > 0) {
    if (friend.currentGameName) {
      return {
        label: `In game · ${friend.currentGameName}`,
        tone: "online",
        live: true,
      };
    }
    const away = AWAY_STATES[state];
    if (away) return { label: away, tone: "away", live: false };
    return { label: "Online", tone: "online", live: true };
  }
  if (friend.lastLogoffAt) {
    return {
      label: `Last online ${formatRelativePlayed(friend.lastLogoffAt, now)}`,
      tone: "offline",
      live: false,
    };
  }
  if (state === 0) return { label: "Offline", tone: "offline", live: false };
  return null;
};

export const PRESENCE_DOT_CLASS: Record<FriendPresenceTone, string> = {
  online: "text-[var(--ok)]",
  away: "text-[var(--warn)]",
  offline: "text-[#4a4a52]",
};

export const friendInitial = (name: string) =>
  (name.trim().charAt(0) || "?").toUpperCase();
