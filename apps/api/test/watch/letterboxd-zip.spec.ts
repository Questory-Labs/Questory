import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  extractLetterboxdCsvs,
  inferLetterboxdKindFromFileName,
  isZipBuffer,
  parseIncludeKinds,
} from "../../src/watch/imports/letterboxd-zip";

function makeZip(files: Record<string, string>): Buffer {
  const encoded: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(files)) {
    encoded[name] = strToU8(text);
  }
  return Buffer.from(zipSync(encoded));
}

const diary =
  "Date,Name,Year,Letterboxd URI,Rating,Rewatch,Tags,Watched Date\n" +
  "2024-01-02,Test Film,2020,https://boxd.it/x,4,, ,2024-01-01\n";
const ratings =
  "Date,Name,Year,Letterboxd URI,Rating\n2024-01-02,Test Film,2020,https://boxd.it/x,4\n";
const watched =
  "Date,Name,Year,Letterboxd URI\n2024-01-02,Test Film,2020,https://boxd.it/x\n";
const watchlist =
  "Date,Name,Year,Letterboxd URI\n2024-01-02,Queued Film,2021,https://boxd.it/y\n";

describe("extractLetterboxdCsvs", () => {
  it("extracts allowlisted CSVs from a nested Letterboxd export folder", () => {
    const buf = makeZip({
      "letterboxd-user-2024-01-01/diary.csv": diary,
      "letterboxd-user-2024-01-01/ratings.csv": ratings,
      "letterboxd-user-2024-01-01/watched.csv": watched,
      "letterboxd-user-2024-01-01/watchlist.csv": watchlist,
      "letterboxd-user-2024-01-01/profile.csv": "Name,Value\nx,y\n",
      "letterboxd-user-2024-01-01/reviews.csv": "ignored\n",
    });

    const files = extractLetterboxdCsvs(buf);
    expect(files.map((f) => f.kind)).toEqual([
      "diary",
      "ratings",
      "watched",
      "watchlist",
    ]);
    expect(files[0].text).toContain("Test Film");
  });

  it("honors include filter", () => {
    const buf = makeZip({
      "export/diary.csv": diary,
      "export/ratings.csv": ratings,
      "export/watched.csv": watched,
    });
    const files = extractLetterboxdCsvs(buf, ["diary", "watchlist"]);
    expect(files.map((f) => f.kind)).toEqual(["diary"]);
  });

  it("skips deleted/orphaned trees and prefers the live CSV", () => {
    const buf = makeZip({
      "export/deleted/diary.csv": "Date,Name\n2020-01-01,Deleted Film\n",
      "export/orphaned/diary.csv": "Date,Name\n2020-01-01,Orphan Film\n",
      "export/diary.csv": diary,
    });
    const files = extractLetterboxdCsvs(buf, ["diary"]);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe("export/diary.csv");
    expect(files[0].text).toContain("Test Film");
  });

  it("rejects path traversal entries by ignoring them", () => {
    const buf = makeZip({
      "../evil.csv": "nope\n",
      "export/diary.csv": diary,
    });
    const files = extractLetterboxdCsvs(buf);
    expect(files.map((f) => f.kind)).toEqual(["diary"]);
  });

  it("throws when no allowlisted CSVs are present", () => {
    const buf = makeZip({ "export/profile.csv": "a,b\n1,2\n" });
    expect(() => extractLetterboxdCsvs(buf)).toThrow(/none of diary\.csv/);
  });
});

describe("letterboxd zip helpers", () => {
  it("detects zip magic and extension", () => {
    const buf = makeZip({ "a.csv": "x\n" });
    expect(isZipBuffer(buf)).toBe(true);
    expect(isZipBuffer(Buffer.from("Date,Name\n"), "diary.csv")).toBe(false);
    expect(isZipBuffer(Buffer.from("not-zip"), "export.zip")).toBe(true);
  });

  it("infers kind from filename", () => {
    expect(inferLetterboxdKindFromFileName("ratings.csv")).toBe("ratings");
    expect(inferLetterboxdKindFromFileName("My Diary.CSV")).toBe("diary");
    expect(inferLetterboxdKindFromFileName("random.csv")).toBe("diary");
  });

  it("parses include kinds", () => {
    expect(parseIncludeKinds("diary,ratings")).toEqual(["diary", "ratings"]);
    expect(parseIncludeKinds("watched watchlist")).toEqual([
      "watched",
      "watchlist",
    ]);
    expect(parseIncludeKinds("nope")).toBeUndefined();
  });
});
