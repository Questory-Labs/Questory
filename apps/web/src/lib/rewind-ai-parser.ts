export interface ParsedInsightChunk {
  title: string;
  text: string;
  tagSlug: string;
}

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

function titleCaseTag(tag: string): string {
  if (tag.startsWith("top")) {
    const rest = tag.slice(3).replace(/([a-z])([A-Z])/g, "$1 $2");
    return `Top ${rest}`;
  }
  const mapped = TAG_TITLE_MAP[tag.toLowerCase()];
  if (mapped) return mapped;
  const spaced = tag.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function splitInsightContent(content: string): string[] {
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
}

function parseTaggedChunk(chunk: string, tagSlug: string, text: string): ParsedInsightChunk {
  const title = titleCaseTag(tagSlug).replace(/\b\w/g, (c) => c.toUpperCase());
  return { title, text: text.trim(), tagSlug: tagSlug.toLowerCase() };
}

export function parseInsightChunk(chunk: string): ParsedInsightChunk {
  const closed = chunk.match(/<([a-z]+)>([\s\S]*?)<\/\1>/i);
  if (closed) {
    return parseTaggedChunk(chunk, closed[1], closed[2]);
  }

  // Cached / legacy SLM output often had an opening tag with no close tag.
  const unclosed = chunk.match(/^\s*<([a-z]+)>([\s\S]*)$/i);
  if (unclosed) {
    return parseTaggedChunk(chunk, unclosed[1], unclosed[2]);
  }

  return { title: "", text: chunk.trim(), tagSlug: "" };
}

/** Split content and duplicate chunks for an infinite-carousel feel. */
export function expandInsightChunks(chunks: string[], repeat = 4): string[] {
  if (!chunks.length) return [];
  return Array.from({ length: repeat }, () => chunks).flat();
}

export interface EmphasisSegment {
  bold: boolean;
  italic: boolean;
  value: string;
}

/** Parses `**bold**` and `*italic*` markdown emphasis out of AI-generated text. */
export function parseBoldSegments(text: string): EmphasisSegment[] {
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
}
