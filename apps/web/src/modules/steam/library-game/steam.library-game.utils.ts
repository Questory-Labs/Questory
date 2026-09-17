import type { GameDetail } from "@questorylabs/shared";
import { formatRelativePlayed } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

export const playtimeHours = (minutes: number) =>
  Math.round((minutes / 60) * 10) / 10;

export const formatHours = (hours: number) => `${hours}h`;

export type CostPerHour = {
  value: number | null;
  source: "paid" | "store" | null;
};

export const costPerHour = (
  hours: number,
  pricePaid: number | null | undefined,
  storePrice: number | null | undefined,
): CostPerHour => {
  if (hours <= 0) return { value: null, source: null };
  if (pricePaid != null) return { value: pricePaid / hours, source: "paid" };
  if (storePrice != null) return { value: storePrice / hours, source: "store" };
  return { value: null, source: null };
};

export type HltbHours = {
  mainHours: number | null;
  extraHours: number | null;
  completionistHours: number | null;
};

export type HltbStory = {
  label: string;
  hint: string;
  ratio: number | null;
};

export const hltbStory = (
  hours: number,
  hltb: HltbHours | null | undefined,
): HltbStory | null => {
  if (!hltb) return null;
  const { mainHours: main, extraHours: extra, completionistHours: complete } =
    hltb;
  if (main != null && main > 0 && hours < main) {
    return {
      label: `${Math.round((hours / main) * 100)}%`,
      hint: `${formatHours(hours)} of ${formatHours(main)} main story`,
      ratio: hours / main,
    };
  }
  if (extra != null && extra > 0 && hours < extra) {
    return {
      label: "Extras",
      hint: `Main done · ${formatHours(hours)} of ${formatHours(extra)} extra`,
      ratio: hours / extra,
    };
  }
  if (complete != null && complete > 0 && hours < complete) {
    return {
      label: "100%",
      hint: `${formatHours(hours)} toward ${formatHours(complete)} completionist`,
      ratio: hours / complete,
    };
  }
  if (complete != null && hours >= complete) {
    return {
      label: "Beyond 100%",
      hint: `${formatHours(hours)} · past completionist`,
      ratio: 1,
    };
  }
  if (main != null) {
    return {
      label: formatHours(hours),
      hint: `${formatHours(main)} main story`,
      ratio: main > 0 ? Math.min(1, hours / main) : null,
    };
  }
  return null;
};

export type PriceStory = {
  label: string;
  hint: string;
};

export const priceStory = (
  current: number | null | undefined,
  historicalLow: number | null | undefined,
  historicalHigh: number | null | undefined,
  currency: string,
): PriceStory | null => {
  if (current == null) return null;
  const label = formatMoney(current, currency);
  if (historicalLow != null && current <= historicalLow * 1.02) {
    return { label, hint: "At historical low" };
  }
  if (historicalHigh != null && historicalHigh > 0 && current < historicalHigh) {
    const drop = Math.round((1 - current / historicalHigh) * 100);
    if (drop >= 5) {
      return { label, hint: `−${drop}% vs historical high` };
    }
  }
  if (historicalLow != null) {
    return { label, hint: `Low ${formatMoney(historicalLow, currency)}` };
  }
  return { label, hint: "Store estimate" };
};

export const friendRank = (
  yourHours: number,
  friends: { playtimeHours: number }[],
): { rank: number; total: number } => {
  const total = friends.length + 1;
  const ahead = friends.filter((f) => f.playtimeHours > yourHours).length;
  return { rank: ahead + 1, total };
};

export const hoursCaption = ({
  lastPlayedAt,
  playtime2Weeks,
  stores,
  unplayed,
}: {
  lastPlayedAt?: string | null;
  playtime2Weeks?: number | null;
  stores?: string[];
  unplayed: boolean;
}) => {
  if (unplayed) return "Still in the queue";
  const parts: string[] = [];
  if (lastPlayedAt) parts.push(formatRelativePlayed(lastPlayedAt));
  if (playtime2Weeks != null && playtime2Weeks > 0) {
    parts.push(`${formatHours(playtimeHours(playtime2Weeks))} in the last two weeks`);
  }
  if (stores?.length) parts.push(`owned on ${stores.join(", ")}`);
  return parts.join(" · ") || "In your library";
};

export const studioLine = (detail: Pick<GameDetail, "developers" | "publishers">) => {
  const parts = [
    ...(detail.developers || []),
    ...(detail.publishers || []).filter(
      (p) => !(detail.developers || []).includes(p),
    ),
  ];
  return parts.slice(0, 3).join(" · ");
};

export type GlanceTile = {
  label: string;
  value: string;
  hint?: string;
  href?: string;
};

export const glanceTiles = (input: {
  achievements?: {
    pct: number | null;
    unlocked: number | null;
    total: number | null;
  } | null;
  hltb: HltbStory | null;
  sessions?: { count: number; lastEndedAt: string | null } | null;
  cost: CostPerHour;
  currency: string;
  review?: { score: number | null; description: string | null } | null;
  friendCount: number;
  rank: { rank: number; total: number } | null;
  playersNow: number | null | undefined;
  price: PriceStory | null;
}): GlanceTile[] => {
  const tiles: GlanceTile[] = [];
  const pct = input.achievements?.pct;
  if (pct != null) {
    tiles.push({
      label: "Achievements",
      value: `${pct}%`,
      hint:
        input.achievements?.unlocked != null && input.achievements.total != null
          ? `${input.achievements.unlocked}/${input.achievements.total} unlocked`
          : undefined,
    });
  }
  if (input.hltb) {
    tiles.push({
      label: "HowLongToBeat",
      value: input.hltb.label,
      hint: input.hltb.hint,
    });
  }
  if (input.sessions && input.sessions.count > 0) {
    tiles.push({
      label: "Sessions",
      value: String(input.sessions.count),
      hint: input.sessions.lastEndedAt
        ? `Last ${formatRelativePlayed(input.sessions.lastEndedAt)}`
        : "qMonitor",
      href: "/sessions",
    });
  }
  if (input.cost.value != null && input.cost.source) {
    tiles.push({
      label: "Cost / hour",
      value: formatMoney(input.cost.value, input.currency),
      hint:
        input.cost.source === "paid"
          ? "From the price you recorded"
          : "Store estimate, not purchase history",
    });
  }
  if (input.review?.score != null || input.review?.description) {
    tiles.push({
      label: "Reviews",
      value:
        input.review.score != null
          ? `${input.review.score}%`
          : (input.review.description ?? "—"),
      hint: input.review.description ?? undefined,
    });
  }
  if (input.friendCount > 0 && input.rank) {
    tiles.push({
      label: "Friends who own it",
      value: String(input.friendCount),
      hint: `You're #${input.rank.rank} of ${input.rank.total} by hours`,
    });
  }
  if (input.playersNow != null) {
    tiles.push({
      label: "Players now",
      value: new Intl.NumberFormat(undefined, {
        notation: input.playersNow >= 10_000 ? "compact" : "standard",
        maximumFractionDigits: input.playersNow >= 10_000 ? 1 : 0,
      }).format(input.playersNow),
    });
  }
  if (input.price) {
    tiles.push({
      label: "Store price",
      value: input.price.label,
      hint: input.price.hint,
    });
  }
  return tiles;
};
