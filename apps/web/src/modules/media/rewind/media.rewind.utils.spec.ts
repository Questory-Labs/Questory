import { describe, expect, it } from "vitest";
import {
  REWIND_CAROUSEL_SIDE_SCALE,
  REWIND_COVERFLOW_NEXT_MASK,
  REWIND_COVERFLOW_PREV_MASK,
} from "./media.rewind.constants";
import type { RewindDomain } from "./media.rewind.types";
import {
  formatAiCards,
  generateCardTheme,
  getDomainIdentity,
  getDomainThemes,
  parseBoldSegments,
  parseInsightChunk,
  resolveVariantIndex,
  rewindCoverflowOffset,
  rewindCoverflowSlideMask,
  rewindCoverflowTransform,
  splitInsightContent,
} from "./media.rewind.utils";

describe("rewindCoverflowOffset", () => {
  it("wraps to the nearest neighbor", () => {
    expect(rewindCoverflowOffset(0, 0, 5)).toBe(0);
    expect(rewindCoverflowOffset(1, 0, 5)).toBe(1);
    expect(rewindCoverflowOffset(4, 0, 5)).toBe(-1);
    expect(rewindCoverflowOffset(0, 4, 5)).toBe(1);
  });
});

describe("rewindCoverflowTransform", () => {
  it("keeps the front card full size and untilted", () => {
    expect(rewindCoverflowTransform(0, false)).toContain("scale(1)");
    expect(rewindCoverflowTransform(0, false)).toContain("rotate(0deg)");
  });

  it("scales and tilts neighbors, and skips tilt when motion is reduced", () => {
    expect(rewindCoverflowTransform(1, false)).toContain(
      `scale(${REWIND_CAROUSEL_SIDE_SCALE})`,
    );
    expect(rewindCoverflowTransform(-1, false)).toContain("rotate(-");
    expect(rewindCoverflowTransform(1, true)).toContain("rotate(0deg)");
  });
});

describe("rewindCoverflowSlideMask", () => {
  it("leaves the front card unmasked and fades both neighbor sides", () => {
    expect(rewindCoverflowSlideMask(0)).toBeUndefined();
    expect(rewindCoverflowSlideMask(-1)).toBe(REWIND_COVERFLOW_PREV_MASK);
    expect(rewindCoverflowSlideMask(1)).toBe(REWIND_COVERFLOW_NEXT_MASK);
  });
});

describe("rewind-ai-parser", () => {
  it("splits on blank lines, then lines, then sentences", () => {
    expect(splitInsightContent("a\n\nb")).toEqual(["a", "b"]);
    expect(splitInsightContent("line one\nline two")).toEqual(["line one", "line two"]);
    expect(splitInsightContent("First sentence. Second sentence!")).toEqual([
      "First sentence.",
      "Second sentence!",
    ]);
  });

  it("parses tagged insight chunks", () => {
    const parsed = parseInsightChunk(
      "<topGenre>You loved **Pop** with 650 plays.</topGenre>",
    );
    expect(parsed.tagSlug).toBe("topgenre");
    expect(parsed.title).toBe("Top Genre");
    expect(parsed.text).toBe("You loved **Pop** with 650 plays.");
  });

  it("parses unclosed tags from legacy SLM output", () => {
    const parsed = parseInsightChunk(
      "<uniquetitles>You explored 19 unique series this month.",
    );
    expect(parsed.tagSlug).toBe("uniquetitles");
    expect(parsed.title).toBe("Unique Titles");
    expect(parsed.text).toBe("You explored 19 unique series this month.");
  });

  it("parses bold segments", () => {
    expect(parseBoldSegments("Hello **world**!")).toEqual([
      { bold: false, italic: false, value: "Hello " },
      { bold: true, italic: false, value: "world" },
      { bold: false, italic: false, value: "!" },
    ]);
  });

  it("parses italic segments", () => {
    expect(parseBoldSegments("You *clung* to it.")).toEqual([
      { bold: false, italic: false, value: "You " },
      { bold: false, italic: true, value: "clung" },
      { bold: false, italic: false, value: " to it." },
    ]);
  });

  it("parses mixed bold and italic segments", () => {
    expect(
      parseBoldSegments("**Rent-A-Girlfriend** had you *hooked* all month."),
    ).toEqual([
      { bold: true, italic: false, value: "Rent-A-Girlfriend" },
      { bold: false, italic: false, value: " had you " },
      { bold: false, italic: true, value: "hooked" },
      { bold: false, italic: false, value: " all month." },
    ]);
  });

  it("leaves unmatched single asterisks as literal text", () => {
    expect(parseBoldSegments("3 * 4 = 12")).toEqual([
      { bold: false, italic: false, value: "3 * 4 = 12" },
    ]);
  });
});

const DOMAINS: RewindDomain[] = ["music", "watch", "read"];

describe("rewind-card-engine", () => {
  it("returns a distinct identity per domain", () => {
    const labels = DOMAINS.map((d) => getDomainIdentity(d).label);
    expect(new Set(labels).size).toBe(3);
    for (const domain of DOMAINS) {
      const identity = getDomainIdentity(domain);
      expect(identity.domain).toBe(domain);
      expect(identity.palette.accent).toMatch(/^#/);
      expect(identity.patternPool.length).toBeGreaterThanOrEqual(12);
    }
  });

  it("generates stable themes for the same inputs", () => {
    for (const domain of DOMAINS) {
      const a = generateCardTheme(domain, 2, "peaktime");
      const b = generateCardTheme(domain, 2, "peaktime");
      expect(a).toEqual(b);
    }
  });

  it("keeps adjacent index themes distinct and wraps after the pool", () => {
    for (const domain of DOMAINS) {
      const pool = getDomainThemes(domain);
      expect(pool.length).toBeGreaterThanOrEqual(12);
      const themes = [0, 1, 2, 3].map((i) => generateCardTheme(domain, i));
      expect(themes[0].container).not.toBe(themes[1].container);
      expect(themes[0].container).not.toBe(themes[3].container);
      expect(generateCardTheme(domain, 0)).toEqual(
        generateCardTheme(domain, pool.length),
      );
    }
  });

  it("maps known tags to preferred variants", () => {
    expect(resolveVariantIndex("music", 99, "topgenre")).toBe(0);
    expect(resolveVariantIndex("watch", 99, "peaktime")).toBe(3);
    expect(resolveVariantIndex("read", 99, "pageturner")).toBe(9);
  });

  it("skips a tag hint when that variant is already used", () => {
    const used = new Set([0]);
    expect(resolveVariantIndex("music", 0, "topgenre", used)).toBe(1);
  });

  it("every theme has required style fields and unique looks", () => {
    for (const domain of DOMAINS) {
      const themes = getDomainThemes(domain);
      const containers = themes.map((theme) => theme.container);
      const patterns = themes.map((theme) => theme.pattern.kind);
      const decorations = themes.map((theme) => theme.decoration);
      expect(new Set(containers).size).toBe(themes.length);
      expect(new Set(patterns).size).toBe(themes.length);
      expect(new Set(decorations).size).toBe(themes.length);
      expect(new Set(getDomainIdentity(domain).patternPool).size).toBe(
        themes.length,
      );
      for (const theme of themes) {
        expect(theme.container.length).toBeGreaterThan(0);
        expect(theme.title.length).toBeGreaterThan(0);
        expect(theme.text.length).toBeGreaterThan(0);
        expect(theme.highlight.length).toBeGreaterThan(0);
        expect(theme.pattern.kind).toBeTruthy();
        expect(theme.decoration).not.toBe("none");
      }
    }
  });

  it("does not repeat themes in a six-card rewind", () => {
    const content = [
      "<topgenre>Genre.</topgenre>",
      "<hourslistened>Hours.</hourslistened>",
      "<uniquetitles>Titles.</uniquetitles>",
      "<peaktime>Peak.</peaktime>",
      "<vibecheck>Vibe.</vibecheck>",
      "<musicpersona>Persona.</musicpersona>",
    ].join("\n\n");
    const cards = formatAiCards(content, "music");
    expect(cards).toHaveLength(6);
    const containers = cards.map((card) => card.theme.container);
    expect(new Set(containers).size).toBe(6);
  });

  it("repeats a theme only after the domain pool is exhausted", () => {
    const content = Array.from({ length: 13 }, (_, i) => `Chunk number ${i}`).join(
      "\n\n",
    );
    const cards = formatAiCards(content, "watch");
    expect(cards).toHaveLength(13);
    const firstTwelve = cards.slice(0, 12).map((card) => card.theme.container);
    expect(new Set(firstTwelve).size).toBe(12);
    expect(cards[12]?.theme.container).toBe(cards[0]?.theme.container);
  });
});
