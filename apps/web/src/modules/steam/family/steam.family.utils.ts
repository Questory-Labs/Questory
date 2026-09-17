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
