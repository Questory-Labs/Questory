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

export function parseInsightChunk(chunk: string): ParsedInsightChunk {
  const match = chunk.match(/<([a-z]+)>([\s\S]*?)<\/\1>/i);
  if (!match) {
    return { title: "", text: chunk.trim(), tagSlug: "" };
  }

  const tagSlug = match[1].toLowerCase();
  const text = match[2].trim();
  const title = titleCaseTag(tagSlug).replace(/\b\w/g, (c) => c.toUpperCase());

  return { title, text, tagSlug };
}

/** Split content and duplicate chunks for an infinite-carousel feel. */
export function expandInsightChunks(chunks: string[], repeat = 4): string[] {
  if (!chunks.length) return [];
  return Array.from({ length: repeat }, () => chunks).flat();
}

export function parseBoldSegments(text: string): { bold: boolean; value: string }[] {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts
    .filter((part) => part.length > 0)
    .map((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return { bold: true, value: part.slice(2, -2) };
      }
      return { bold: false, value: part };
    });
}
