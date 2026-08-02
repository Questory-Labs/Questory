import { describe, expect, it } from "vitest";
import {
  expandInsightChunks,
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

  it("parses bold segments", () => {
    expect(parseBoldSegments("Hello **world**!")).toEqual([
      { bold: false, value: "Hello " },
      { bold: true, value: "world" },
      { bold: false, value: "!" },
    ]);
  });

  it("expands chunks for carousel repetition", () => {
    expect(expandInsightChunks(["a", "b"], 2)).toEqual(["a", "b", "a", "b"]);
  });
});
