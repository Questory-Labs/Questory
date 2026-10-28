import { describe, expect, it } from "vitest";
import type { ReadLibraryItem } from "@questorylabs/shared";
import { formatLabel, libraryItemMeta } from "./read.library.utils";
import { readStatusColor, readStatusLabel } from "./read.library.constants";

const item = (over: Record<string, unknown> = {}, title: Record<string, unknown> = {}) =>
  ({
    progressChapters: 10,
    progressVolumes: 0,
    score: null,
    ...over,
    title: { format: "manga", chapters: 40, category: null, ...title },
  }) as unknown as ReadLibraryItem;

describe("read.library.utils", () => {
  it("labels known formats and passes unknown through", () => {
    expect(formatLabel("zzz")).toBe("zzz");
    expect(formatLabel("manga")).not.toBe("");
  });

  it("builds item meta from progress, volumes, category and score", () => {
    expect(libraryItemMeta(item())).toBe(`${formatLabel("manga")} · Ch. 10/40`);
    expect(libraryItemMeta(item({ progressVolumes: 2, score: 8 }, { chapters: null, category: "Seinen" }))).toBe(
      `${formatLabel("manga")} · Ch. 10 · Vol. 2 · Seinen · Score 8`,
    );
    expect(libraryItemMeta(item({ progressChapters: 0 }, { chapters: null }))).toBe(formatLabel("manga"));
  });

  it("maps status colours and labels", () => {
    expect(readStatusColor("reading")).toBe("var(--read)");
    expect(readStatusColor("weird")).toBe("var(--ink)");
    expect(readStatusColor(null)).toBe("var(--ink)");
    expect(readStatusLabel("weird")).toBe("weird");
    expect(readStatusLabel(null)).toBe("");
  });
});
