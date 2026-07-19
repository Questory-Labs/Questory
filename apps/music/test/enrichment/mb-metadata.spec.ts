import { describe, expect, it } from "vitest";
import {
  classifyTagKind,
  parseMbYear,
  pickBestRelease,
  yearFromRelease,
} from "../../src/enrichment/mb-metadata";

describe("mb-metadata", () => {
  it("classifies mood tags vs genres", () => {
    expect(classifyTagKind("chill")).toBe("mood");
    expect(classifyTagKind("Melancholic")).toBe("mood");
    expect(classifyTagKind("energetic")).toBe("mood");
    expect(classifyTagKind("rock")).toBe("genre");
    expect(classifyTagKind("indie folk")).toBe("genre");
  });

  it("parses MusicBrainz year strings", () => {
    expect(parseMbYear("1999")).toBe(1999);
    expect(parseMbYear("1999-06")).toBe(1999);
    expect(parseMbYear("1999-06-15")).toBe(1999);
    expect(parseMbYear("")).toBeNull();
    expect(parseMbYear(null)).toBeNull();
    expect(parseMbYear("nope")).toBeNull();
  });

  it("picks the earliest dated release when available", () => {
    const best = pickBestRelease([
      { id: "a", date: "2010-01-01" },
      { id: "b", date: "2001-05-20" },
      { id: "c" },
    ]);
    expect(best?.id).toBe("b");
    expect(yearFromRelease(best)).toBe(2001);
  });

  it("falls back to first release without a date", () => {
    const best = pickBestRelease([{ id: "only" }]);
    expect(best?.id).toBe("only");
    expect(yearFromRelease(best)).toBeNull();
  });
});
