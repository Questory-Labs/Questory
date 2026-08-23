import {
  MUSIC_VARIANTS,
  READ_VARIANTS,
  WATCH_VARIANTS,
} from "./media.rewind.theme-catalog";
import type {
  DomainIdentity,
  RewindCardTheme,
  RewindDomain,
} from "./media.rewind.types";

const MUSIC_IDENTITY: DomainIdentity = {
  domain: "music",
  label: "Electric",
  palette: {
    surface: "#0a0a0a",
    surfaceAlt: "#4338ca",
    accent: "#ccff00",
    accentMuted: "#fb923c",
    ink: "#ffffff",
    inkMuted: "#e0e7ff",
    highlightBg: "#ccff00",
    highlightFg: "#000000",
    border: "#000000",
  },
  titleFont: "font-black uppercase tracking-tighter",
  bodyFont: "font-black uppercase tracking-tight",
  patternPool: MUSIC_VARIANTS.map((theme) => theme.pattern.kind),
};

const WATCH_IDENTITY: DomainIdentity = {
  domain: "watch",
  label: "Cinematic",
  palette: {
    surface: "#000000",
    surfaceAlt: "#1e3a8a",
    accent: "#fcd34d",
    accentMuted: "#fbbf24",
    ink: "#f5f5f5",
    inkMuted: "#d4d4d8",
    highlightBg: "#fbbf24",
    highlightFg: "#1e3a8a",
    border: "#404040",
  },
  titleFont: "font-serif italic",
  bodyFont: "font-light tracking-wide",
  patternPool: WATCH_VARIANTS.map((theme) => theme.pattern.kind),
};

const READ_IDENTITY: DomainIdentity = {
  domain: "read",
  label: "Literary",
  palette: {
    surface: "#fef3c7",
    surfaceAlt: "#064e3b",
    accent: "#991b1b",
    accentMuted: "#dc2626",
    ink: "#1c1917",
    inkMuted: "#44403c",
    highlightBg: "#991b1b",
    highlightFg: "#fef3c7",
    border: "#d4d4d8",
  },
  titleFont: "font-serif uppercase tracking-widest",
  bodyFont: "font-serif leading-relaxed",
  patternPool: READ_VARIANTS.map((theme) => theme.pattern.kind),
};

const DOMAIN_IDENTITIES: Record<RewindDomain, DomainIdentity> = {
  music: MUSIC_IDENTITY,
  watch: WATCH_IDENTITY,
  read: READ_IDENTITY,
};

const DOMAIN_VARIANTS: Record<RewindDomain, RewindCardTheme[]> = {
  music: MUSIC_VARIANTS,
  watch: WATCH_VARIANTS,
  read: READ_VARIANTS,
};

/** Maps insight tag slugs to a preferred variant index within each domain. */
const TAG_VARIANT_HINTS: Record<string, number> = {
  topgenre: 0,
  hourslistened: 1,
  hourswatched: 1,
  chapterslogged: 1,
  uniquetitles: 2,
  peaktime: 3,
  vibecheck: 4,
  musicpersona: 5,
  bingepersona: 5,
  couchpotato: 6,
  genrewhiplash: 7,
  bookwormpersona: 8,
  pageturner: 9,
  worldhopper: 10,
};

export const getDomainIdentity = (domain: RewindDomain): DomainIdentity =>
  DOMAIN_IDENTITIES[domain];

export const getDomainThemes = (domain: RewindDomain): RewindCardTheme[] =>
  DOMAIN_VARIANTS[domain];

export const resolveVariantIndex = (
  domain: RewindDomain,
  cardIndex: number,
  tagSlug?: string,
  used?: ReadonlySet<number>,
): number => {
  const variants = DOMAIN_VARIANTS[domain];
  const count = variants.length;
  if (count === 0) return 0;

  const hint =
    tagSlug !== undefined
      ? TAG_VARIANT_HINTS[tagSlug.toLowerCase()]
      : undefined;
  const preferred =
    hint !== undefined ? hint % count : ((cardIndex % count) + count) % count;

  if (!used || used.size >= count) return preferred;
  if (!used.has(preferred)) return preferred;

  for (let step = 0; step < count; step++) {
    const idx = (((cardIndex + step) % count) + count) % count;
    if (!used.has(idx)) return idx;
  }
  return preferred;
};

export const generateCardTheme = (
  domain: RewindDomain,
  cardIndex: number,
  tagSlug?: string,
  used?: ReadonlySet<number>,
): RewindCardTheme => {
  const variantIndex = resolveVariantIndex(domain, cardIndex, tagSlug, used);
  return DOMAIN_VARIANTS[domain][variantIndex]!;
};

export const pickCardThemes = (
  domain: RewindDomain,
  cards: { cardIndex: number; tagSlug?: string }[],
): RewindCardTheme[] => {
  const used = new Set<number>();
  return cards.map((card) => {
    const index = resolveVariantIndex(domain, card.cardIndex, card.tagSlug, used);
    used.add(index);
    return DOMAIN_VARIANTS[domain][index]!;
  });
};
