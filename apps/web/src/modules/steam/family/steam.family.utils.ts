import { FAMILY_MEMBER_LIMIT } from "@questorylabs/shared";

export const normalizeSteamId = (id: string) => String(id ?? "").trim();

export const remainingFamilySlots = (memberCount: number) =>
  Math.max(0, FAMILY_MEMBER_LIMIT - memberCount);

export const canRemoveFamilyMember = (m: {
  role?: string;
  isMe?: boolean;
}) => m.role !== "owner" && !m.isMe;

export const parseApiError = (err: Error) => {
  try {
    const parsed = JSON.parse(err.message) as { message?: string | string[] };
    const msg = parsed.message;
    if (Array.isArray(msg)) return msg.join(", ");
    return msg || err.message;
  } catch {
    return err.message || "Request failed";
  }
};

export const memberLabel = (m: {
  personaName: string;
  isMe?: boolean;
  steamId: string;
}) => {
  const name =
    m.personaName === m.steamId || m.personaName === `Steam ${m.steamId}`
      ? "Steam user"
      : m.personaName;
  return m.isMe ? `${name} (me)` : name;
};

export const libraryMix = (
  m: { librarySize: number; sharedCount?: number; uniqueCount?: number },
  maxLibrary: number,
) => {
  const scale = maxLibrary > 0 ? 100 / maxLibrary : 0;
  const shared = Math.max(0, m.sharedCount ?? 0);
  const unique = Math.max(0, m.uniqueCount ?? 0);
  const other = Math.max(0, m.librarySize - shared - unique);
  const pct = (n: number) => Math.round(n * scale * 10) / 10;
  return { shared: pct(shared), unique: pct(unique), other: pct(other) };
};

export const shareableLabel = (item: {
  direction: "toYou" | "fromYou";
  ownerName: string;
  wantedByName: string;
}) =>
  item.direction === "toYou"
    ? `${item.ownerName} → you`
    : `You → ${item.wantedByName}`;
