import type { PrismaService } from "../../prisma/prisma.service";
import { normalizeName } from "../lib/normalize";

export function yearsCompatible(
  a: number | null | undefined,
  b: number | null | undefined,
): boolean {
  if (a == null || b == null) return true;
  return Math.abs(a - b) <= 1;
}

/** Exact normalized match, or a longer title that starts with the shorter + space. */
export function namesLikelySame(a: string, b: string): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const [shorter, longer] =
    left.length <= right.length ? [left, right] : [right, left];
  if (shorter.length < 5) return false;
  return longer.startsWith(`${shorter} `);
}

/** Prefix tokens of a normalized name, for matching "Frieren" to "Frieren Beyond…". */
export function namePrefixCandidates(normalized: string): string[] {
  const parts = normalized.split(" ").filter(Boolean);
  const out: string[] = [];
  let acc = "";
  for (const part of parts) {
    acc = acc ? `${acc} ${part}` : part;
    if (acc.length >= 5 && acc !== normalized) out.push(acc);
  }
  return out;
}

const NAME_MATCH_TAKE = 25;

export async function findTitleByName(
  prisma: PrismaService,
  input: { type: string; name: string; year?: number | null },
) {
  const nameNormalized = normalizeName(input.name);
  if (!nameNormalized) return null;

  const prefixes = namePrefixCandidates(nameNormalized);
  const year = input.year ?? null;
  const allowPrefix = year != null && nameNormalized.length >= 5;
  const yearFilter =
    year == null ? {} : { year: { gte: year - 1, lte: year + 1 } };

  const candidates = await prisma.title.findMany({
    where: {
      type: input.type,
      ...yearFilter,
      OR: [
        { nameNormalized },
        ...(allowPrefix
          ? [{ nameNormalized: { startsWith: `${nameNormalized} ` } }]
          : []),
        ...(allowPrefix && prefixes.length > 0
          ? [{ nameNormalized: { in: prefixes } }]
          : []),
      ],
    },
    take: NAME_MATCH_TAKE,
  });

  const matched = candidates.filter(
    (row) =>
      yearsCompatible(row.year, year) &&
      namesLikelySame(row.name, input.name),
  );
  if (matched.length === 0) return null;

  matched.sort((a, b) => {
    const aExact = normalizeName(a.name) === nameNormalized ? 1 : 0;
    const bExact = normalizeName(b.name) === nameNormalized ? 1 : 0;
    if (bExact !== aExact) return bExact - aExact;
    const aTmdb = a.tmdbId != null ? 1 : 0;
    const bTmdb = b.tmdbId != null ? 1 : 0;
    return bTmdb - aTmdb;
  });
  return matched[0];
}

