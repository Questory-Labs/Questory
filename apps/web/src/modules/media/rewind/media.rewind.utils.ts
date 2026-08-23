import {
  REWIND_CAROUSEL_SIDE_ROTATE_DEG,
  REWIND_CAROUSEL_SIDE_SCALE,
  REWIND_CAROUSEL_SIDE_SHIFT,
  REWIND_COVERFLOW_NEXT_MASK,
  REWIND_COVERFLOW_PREV_MASK,
} from "./media.rewind.constants";
import { pickCardThemes } from "./media.rewind.themes";
import type {
  EmphasisSegment,
  ParsedInsightChunk,
  RewindDomain,
} from "./media.rewind.types";

export {
  generateCardTheme,
  getDomainIdentity,
  getDomainThemes,
  pickCardThemes,
  resolveVariantIndex,
} from "./media.rewind.themes";

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

/** Edge fade for cover-flow neighbors so card sides dissolve instead of clipping. */
export const rewindCoverflowSlideMask = (offset: number): string | undefined => {
  if (offset === 0) return undefined;
  return offset < 0 ? REWIND_COVERFLOW_PREV_MASK : REWIND_COVERFLOW_NEXT_MASK;
};

export const formatAiCards = (content: string, domain: RewindDomain) => {
  const parsed = splitInsightContent(content).map((chunk, i) => {
    const { title, text, tagSlug } = parseInsightChunk(chunk);
    return { title, text, tagSlug, cardIndex: i };
  });
  const themes = pickCardThemes(
    domain,
    parsed.map((card) => ({
      cardIndex: card.cardIndex,
      tagSlug: card.tagSlug || undefined,
    })),
  );
  return parsed.map((card, i) => ({
    title: card.title,
    text: card.text,
    theme: themes[i]!,
  }));
};
