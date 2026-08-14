export function overlayArtistCredit(
  artistName: string,
  trackId: string | null | undefined,
  credits: Map<string, string>,
): string {
  if (!trackId) return artistName;
  return credits.get(trackId) || artistName;
}

type ArtistCreditRow = {
  artistCredit: string | null;
  targetTrackId: string | null;
  sourceTrackId: string | null;
};

export async function loadArtistCreditsByTrackId(
  prisma: {
    userMusicRule: {
      findMany: (args: object) => Promise<ArtistCreditRow[]>;
    };
  },
  userId: string,
  trackIds: string[],
): Promise<Map<string, string>> {
  if (trackIds.length === 0) return new Map();
  const unique = [...new Set(trackIds)];
  const rows = await prisma.userMusicRule.findMany({
    where: {
      userId,
      artistCredit: { not: null },
      OR: [
        { targetTrackId: { in: unique } },
        { sourceTrackId: { in: unique } },
      ],
    },
    select: {
      artistCredit: true,
      targetTrackId: true,
      sourceTrackId: true,
    },
  });
  const map = new Map<string, string>();
  for (const row of rows) {
    const credit = row.artistCredit?.trim();
    if (!credit) continue;
    if (row.targetTrackId) map.set(row.targetTrackId, credit);
    if (row.sourceTrackId) map.set(row.sourceTrackId, credit);
  }
  return map;
}
