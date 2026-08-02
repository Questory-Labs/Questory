export type RewindDomain = "music" | "watch" | "read";

export type PatternKind =
  | "checkerboard"
  | "concentric-rings"
  | "polka-dots"
  | "film-bars"
  | "ticket-stub"
  | "scanlines"
  | "paper-noise"
  | "margin-line"
  | "diagonal-stripes";

export type DecorationKind = "vignette" | "rec-badge" | "margin-line" | "none";

export interface PatternSpec {
  kind: PatternKind;
  color: string;
  colorAlt?: string;
  opacity?: number;
}

export interface RewindCardTheme {
  container: string;
  title: string;
  text: string;
  highlight: string;
  pattern: PatternSpec;
  decoration: DecorationKind;
  /** Bottom fade hint when content scrolls */
  scrollFade: string;
}

export interface DomainPalette {
  surface: string;
  surfaceAlt: string;
  accent: string;
  accentMuted: string;
  ink: string;
  inkMuted: string;
  highlightBg: string;
  highlightFg: string;
  border?: string;
}

export interface DomainIdentity {
  domain: RewindDomain;
  label: string;
  palette: DomainPalette;
  titleFont: string;
  bodyFont: string;
  patternPool: PatternKind[];
}

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
  patternPool: ["checkerboard", "concentric-rings", "polka-dots"],
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
  patternPool: ["film-bars", "ticket-stub", "scanlines"],
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
  patternPool: ["paper-noise", "margin-line", "diagonal-stripes"],
};

const DOMAIN_IDENTITIES: Record<RewindDomain, DomainIdentity> = {
  music: MUSIC_IDENTITY,
  watch: WATCH_IDENTITY,
  read: READ_IDENTITY,
};

/** Maps insight tag slugs to a preferred variant index within each domain. */
const TAG_VARIANT_HINTS: Record<string, number> = {
  topgenre: 0,
  hourslistened: 1,
  hourswatched: 1,
  chapterslogged: 1,
  uniquetitles: 2,
  peaktime: 2,
  vibecheck: 0,
  musicpersona: 1,
  bingepersona: 1,
  couchpotato: 2,
  genrewhiplash: 0,
  bookwormpersona: 1,
  pageturner: 2,
  worldhopper: 0,
};

const MUSIC_VARIANTS: RewindCardTheme[] = [
  {
    container: "bg-[#0a0a0a] border-none",
    title: "text-[#ccff00] font-black uppercase tracking-tighter text-2xl md:text-4xl mix-blend-difference drop-shadow-lg",
    text: "text-white font-black uppercase tracking-tight",
    highlight: "text-black bg-[#ccff00] px-3 py-1 rotate-1 inline-block",
    pattern: { kind: "checkerboard", color: "#ffffff", opacity: 0.2 },
    decoration: "none",
    scrollFade: "from-black/40",
  },
  {
    container: "bg-[#4338ca] border-none",
    title:
      "text-[#fb923c] font-black uppercase text-lg md:text-2xl tracking-widest px-6 py-2 bg-[#312e81] inline-block rounded-full shadow-xl",
    text: "text-indigo-50 font-bold",
    highlight: "text-[#fb923c]",
    pattern: { kind: "concentric-rings", color: "#3730a3", colorAlt: "#312e81", opacity: 0.5 },
    decoration: "none",
    scrollFade: "from-[#4338ca]",
  },
  {
    container: "bg-[#f4f4f5] border-[12px] border-black",
    title:
      "text-black font-black uppercase text-xl md:text-3xl bg-white inline-block px-4 py-2 border-4 border-black",
    text: "text-black font-black uppercase tracking-tight",
    highlight: "text-white bg-black px-4 py-1 inline-block -rotate-2",
    pattern: { kind: "polka-dots", color: "#000000", opacity: 0.1 },
    decoration: "none",
    scrollFade: "from-[#f4f4f5]",
  },
];

const WATCH_VARIANTS: RewindCardTheme[] = [
  {
    container: "bg-black border border-neutral-800",
    title: "text-[#fcd34d] font-serif italic text-2xl md:text-4xl opacity-80",
    text: "text-neutral-300 font-light tracking-wide",
    highlight: "text-white font-normal",
    pattern: { kind: "film-bars", color: "#171717", opacity: 1 },
    decoration: "vignette",
    scrollFade: "from-black/50",
  },
  {
    container: "bg-[#1e3a8a] border-8 border-[#fbbf24]",
    title:
      "text-[#fbbf24] font-black uppercase text-lg md:text-2xl tracking-[0.3em] border-y-4 border-[#fbbf24] py-3 inline-block",
    text: "text-blue-50 font-bold uppercase",
    highlight: "text-[#1e3a8a] bg-[#fbbf24] px-3 py-1",
    pattern: { kind: "ticket-stub", color: "var(--bg-0)", opacity: 1 },
    decoration: "none",
    scrollFade: "from-[#1e3a8a]",
  },
  {
    container: "bg-[#0f172a] border-2 border-cyan-900",
    title:
      "text-cyan-400 font-mono font-bold uppercase text-xl md:text-3xl tracking-widest bg-[#0f172a] inline-block px-4 py-2 border border-cyan-800",
    text: "text-slate-300 font-mono",
    highlight: "text-cyan-200 bg-cyan-900/80 px-2 py-1 border border-cyan-400/50",
    pattern: { kind: "scanlines", color: "cyan", opacity: 0.2 },
    decoration: "rec-badge",
    scrollFade: "from-[#0f172a]",
  },
];

const READ_VARIANTS: RewindCardTheme[] = [
  {
    container: "bg-[#fef3c7] border border-[#d4d4d8]",
    title:
      "text-[#991b1b] font-serif uppercase tracking-widest text-xl md:text-3xl border-b-2 border-[#991b1b] pb-2 inline-block",
    text: "text-[#1c1917] font-serif leading-relaxed",
    highlight: "text-[#991b1b] font-bold italic",
    pattern: { kind: "paper-noise", color: "#000000", opacity: 0.4 },
    decoration: "margin-line",
    scrollFade: "from-[#fef3c7]",
  },
  {
    container: "bg-white border-[16px] border-black",
    title:
      "text-black font-sans font-black uppercase text-2xl md:text-4xl bg-white inline-block pr-4 relative z-10",
    text: "text-black font-sans font-medium relative z-10",
    highlight: "text-white bg-red-600 px-3 py-1 inline-block",
    pattern: { kind: "margin-line", color: "#000000", opacity: 0.2 },
    decoration: "none",
    scrollFade: "from-white",
  },
  {
    container: "bg-[#064e3b] border-none",
    title: "text-emerald-200 font-serif italic text-2xl md:text-4xl relative z-10",
    text: "text-emerald-50 font-serif font-light relative z-10",
    highlight: "text-emerald-200 border-b-2 border-emerald-400",
    pattern: { kind: "diagonal-stripes", color: "#ffffff", opacity: 0.2 },
    decoration: "none",
    scrollFade: "from-[#064e3b]",
  },
];

const DOMAIN_VARIANTS: Record<RewindDomain, RewindCardTheme[]> = {
  music: MUSIC_VARIANTS,
  watch: WATCH_VARIANTS,
  read: READ_VARIANTS,
};

export function getDomainIdentity(domain: RewindDomain): DomainIdentity {
  return DOMAIN_IDENTITIES[domain];
}

export function resolveVariantIndex(domain: RewindDomain, cardIndex: number, tagSlug?: string): number {
  const variants = DOMAIN_VARIANTS[domain];
  if (tagSlug) {
    const hint = TAG_VARIANT_HINTS[tagSlug.toLowerCase()];
    if (hint !== undefined) return hint % variants.length;
  }
  return cardIndex % variants.length;
}

export function generateCardTheme(domain: RewindDomain, cardIndex: number, tagSlug?: string): RewindCardTheme {
  const variantIndex = resolveVariantIndex(domain, cardIndex, tagSlug);
  return DOMAIN_VARIANTS[domain][variantIndex];
}
