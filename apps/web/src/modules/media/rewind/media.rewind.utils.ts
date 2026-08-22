import {
  REWIND_CAROUSEL_SIDE_ROTATE_DEG,
  REWIND_CAROUSEL_SIDE_SCALE,
  REWIND_CAROUSEL_SIDE_SHIFT,
} from "./media.rewind.constants";
import type {
  DomainIdentity,
  EmphasisSegment,
  ParsedInsightChunk,
  RewindCardTheme,
  RewindDomain,
} from "./media.rewind.types";

const TAG_TITLE_MAP: Record<string, string> = {
  hourslistened: "Hours Listened",
  hourswatched: "Hours Watched",
  uniquetitles: "Unique Titles",
  chapterslogged: "Chapters Logged",
  peaktime: "Peak Time",
  vibecheck: "Vibe Check",
  musicpersona: "Music Persona",
  bingepersona: "Binge Persona",
  couchpotato: "Couch Potato",
  genrewhiplash: "Genre Whiplash",
  bookwormpersona: "Bookworm Persona",
  pageturner: "Page Turner",
  worldhopper: "World Hopper",
};

const titleCaseTag = (tag: string): string => {
  if (tag.startsWith("top")) {
    const rest = tag.slice(3).replace(/([a-z])([A-Z])/g, "$1 $2");
    return `Top ${rest}`;
  }
  const mapped = TAG_TITLE_MAP[tag.toLowerCase()];
  if (mapped) return mapped;
  const spaced = tag.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
};

export const splitInsightContent = (content: string): string[] => {
  if (!content) return [];

  let chunks = content.split(/\n\s*\n/).filter(Boolean);
  if (chunks.length === 1) {
    chunks = content.split(/\n/).filter(Boolean);
  }
  if (chunks.length === 1) {
    const sentences = content.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 1) {
      chunks = sentences.map((s) => s.trim()).filter(Boolean);
    }
  }
  return chunks;
};

const parseTaggedChunk = (
  tagSlug: string,
  text: string,
): ParsedInsightChunk => {
  const title = titleCaseTag(tagSlug).replace(/\b\w/g, (c) => c.toUpperCase());
  return { title, text: text.trim(), tagSlug: tagSlug.toLowerCase() };
};

export const parseInsightChunk = (chunk: string): ParsedInsightChunk => {
  const closed = chunk.match(/<([a-z]+)>([\s\S]*?)<\/\1>/i);
  if (closed) {
    return parseTaggedChunk(closed[1], closed[2]);
  }

  const unclosed = chunk.match(/^\s*<([a-z]+)>([\s\S]*)$/i);
  if (unclosed) {
    return parseTaggedChunk(unclosed[1], unclosed[2]);
  }

  return { title: "", text: chunk.trim(), tagSlug: "" };
};

/** Parses `**bold**` and `*italic*` markdown emphasis out of AI-generated text. */
export const parseBoldSegments = (text: string): EmphasisSegment[] => {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**") && part.length > 3) {
        return { bold: true, italic: false, value: part.slice(2, -2) };
      }
      if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
        return { bold: false, italic: true, value: part.slice(1, -1) };
      }
      return { bold: false, italic: false, value: part };
    });
};

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

export const getDomainIdentity = (domain: RewindDomain): DomainIdentity =>
  DOMAIN_IDENTITIES[domain];

export const resolveVariantIndex = (
  domain: RewindDomain,
  cardIndex: number,
  tagSlug?: string,
): number => {
  const variants = DOMAIN_VARIANTS[domain];
  if (tagSlug) {
    const hint = TAG_VARIANT_HINTS[tagSlug.toLowerCase()];
    if (hint !== undefined) return hint % variants.length;
  }
  return cardIndex % variants.length;
};

export const generateCardTheme = (
  domain: RewindDomain,
  cardIndex: number,
  tagSlug?: string,
): RewindCardTheme => {
  const variantIndex = resolveVariantIndex(domain, cardIndex, tagSlug);
  return DOMAIN_VARIANTS[domain][variantIndex];
};

/** Shortest wrapped offset of a slide from the current index. */
export const rewindCoverflowOffset = (
  slideIndex: number,
  current: number,
  count: number,
): number => {
  if (count <= 0) return 0;
  let diff = slideIndex - current;
  const half = count / 2;
  if (diff > half) diff -= count;
  if (diff < -half) diff += count;
  return diff;
};

export const rewindCoverflowTransform = (
  offset: number,
  reducedMotion: boolean,
): string => {
  if (offset === 0) return "translate3d(0,0,0) scale(1) rotate(0deg)";
  const dir = Math.sign(offset);
  const far = Math.abs(offset) > 1;
  const shift = dir * REWIND_CAROUSEL_SIDE_SHIFT * (far ? 1.35 : 1);
  const scale = REWIND_CAROUSEL_SIDE_SCALE * (far ? 0.88 : 1);
  const rotate = reducedMotion
    ? 0
    : dir * REWIND_CAROUSEL_SIDE_ROTATE_DEG * (far ? 1.2 : 1);
  return `translate3d(${shift * 100}%,0,0) scale(${scale}) rotate(${rotate}deg)`;
};

export const formatAiCards = (content: string, domain: RewindDomain) =>
  splitInsightContent(content).map((chunk, i) => {
    const { title, text, tagSlug } = parseInsightChunk(chunk);
    return { title, text, theme: generateCardTheme(domain, i, tagSlug) };
  });
