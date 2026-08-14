import { describe, expect, it } from "vitest";
import {
  parseBoldSegments,
  parseInsightChunk,
  splitInsightContent,
} from "./rewind-ai-parser";

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
    const parsed = parseInsightChunk("<topGenre>You loved **Pop** with 650 plays.</topGenre>");
    expect(parsed.tagSlug).toBe("topgenre");
    expect(parsed.title).toBe("Top Genre");
    expect(parsed.text).toBe("You loved **Pop** with 650 plays.");
  });

  it("parses unclosed tags from legacy SLM output", () => {
    const parsed = parseInsightChunk("<uniquetitles>You explored 19 unique series this month.");
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
    expect(parseBoldSegments("**Rent-A-Girlfriend** had you *hooked* all month.")).toEqual([
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
