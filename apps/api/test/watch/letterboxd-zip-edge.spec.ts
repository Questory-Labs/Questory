import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import {
  extractLetterboxdCsvs,
  inferLetterboxdKindFromFileName,
  isZipBuffer,
  parseIncludeKinds,
} from "../../src/watch/imports/letterboxd-zip";

const MB = 1024 * 1024;
const DIARY = "Date,Name\n2024-01-01,Film\n";

function makeZip(files: Record<string, string | Uint8Array>): Buffer {
  const encoded: Record<string, Uint8Array> = {};
  for (const [name, value] of Object.entries(files)) {
    encoded[name] = typeof value === "string" ? strToU8(value) : value;
  }
  return Buffer.from(zipSync(encoded));
}

describe("extractLetterboxdCsvs malformed archives", () => {
  it.each([
    ["random bytes", Buffer.from("definitely not a zip")],
    ["truncated local header", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00])],
  ])("reports %s as invalid", (_label, buffer) => {
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "Invalid or corrupted zip archive",
    );
  });

  it("reports a truncated archive as corrupted", () => {
    const zip = makeZip({ "diary.csv": DIARY });
    expect(() => extractLetterboxdCsvs(zip.subarray(0, 12))).toThrow(
      "Invalid or corrupted zip archive",
    );
  });

  it("rejects an empty archive", () => {
    expect(() => extractLetterboxdCsvs(makeZip({}))).toThrow(
      "Zip contained none of",
    );
  });

  it("rejects an archive holding only a directory entry", () => {
    expect(() =>
      extractLetterboxdCsvs(makeZip({ "diary.csv/": new Uint8Array(0) })),
    ).toThrow("Zip contained none of");
  });
});

describe("extractLetterboxdCsvs path handling", () => {
  it.each([
    "..\\diary.csv",
    "export/..\\diary.csv",
    "../diary.csv",
    "export/../../diary.csv",
    "./diary.csv",
    "C:/diary.csv",
    "C:\\diary.csv",
  ])("ignores unsafe path %j", (path) => {
    expect(() => extractLetterboxdCsvs(makeZip({ [path]: DIARY }))).toThrow(
      "Zip contained none of",
    );
  });

  it.each([
    "deleted/diary.csv",
    "Deleted/diary.csv",
    "orphaned/diary.csv",
    "export/ORPHANED/diary.csv",
    "__MACOSX/diary.csv",
  ])("skips backup tree %j", (path) => {
    expect(() => extractLetterboxdCsvs(makeZip({ [path]: DIARY }))).toThrow(
      "Zip contained none of",
    );
  });

  it("normalizes backslash folders in the reported path", () => {
    const [file] = extractLetterboxdCsvs(
      makeZip({ "export\\diary.csv": DIARY }),
    );
    expect(file.path).toBe("export/diary.csv");
    expect(file.text).toBe(DIARY);
  });

  it("matches file names case-insensitively", () => {
    const files = extractLetterboxdCsvs(makeZip({ "DIARY.CSV": DIARY }));
    expect(files.map((f) => f.kind)).toEqual(["diary"]);
  });

  it.each(["my-diary.csv", "diary.csv.bak", "diary.txt", "reviews.csv"])(
    "does not accept lookalike %j",
    (path) => {
      expect(() => extractLetterboxdCsvs(makeZip({ [path]: DIARY }))).toThrow(
        "Zip contained none of",
      );
    },
  );

  it("prefers the shallowest path regardless of entry order", () => {
    const [file] = extractLetterboxdCsvs(
      makeZip({
        "a/b/c/diary.csv": "deep",
        "a/diary.csv": "shallow",
        "a/b/diary.csv": "middle",
      }),
    );
    expect(file.text).toBe("shallow");
    expect(file.path).toBe("a/diary.csv");
  });

  it("returns kinds in canonical order", () => {
    const files = extractLetterboxdCsvs(
      makeZip({
        "watchlist.csv": "w",
        "watched.csv": "x",
        "ratings.csv": "r",
        "diary.csv": "d",
      }),
    );
    expect(files.map((f) => f.kind)).toEqual([
      "diary",
      "ratings",
      "watched",
      "watchlist",
    ]);
  });

  it("decodes UTF-8 titles", () => {
    const text = "Name\nAmélie 千と千尋\n";
    const [file] = extractLetterboxdCsvs(makeZip({ "diary.csv": text }));
    expect(file.text).toBe(text);
  });

  it("errors when the include filter matches nothing present", () => {
    expect(() =>
      extractLetterboxdCsvs(makeZip({ "diary.csv": DIARY }), ["watchlist"]),
    ).toThrow("Zip contained none of");
  });

  it("treats an empty include list as every kind", () => {
    const files = extractLetterboxdCsvs(
      makeZip({ "diary.csv": DIARY, "watched.csv": DIARY }),
      [],
    );
    expect(files).toHaveLength(2);
  });
});

describe("extractLetterboxdCsvs resource limits", () => {
  it("accepts exactly 256 entries", () => {
    const entries: Record<string, string> = { "diary.csv": DIARY };
    for (let i = 0; i < 255; i += 1) entries[`junk/${i}.txt`] = "x";
    expect(extractLetterboxdCsvs(makeZip(entries))).toHaveLength(1);
  });

  it("rejects more than 256 entries", () => {
    const entries: Record<string, string> = { "diary.csv": DIARY };
    for (let i = 0; i < 256; i += 1) entries[`junk/${i}.txt`] = "x";
    expect(() => extractLetterboxdCsvs(makeZip(entries))).toThrow(
      "too many entries",
    );
  });

  it("drops a single entry above 15 MB", () => {
    const big = new Uint8Array(15 * MB + 1).fill(0x61);
    expect(() =>
      extractLetterboxdCsvs(makeZip({ "diary.csv": big })),
    ).toThrow("Zip contained none of");
  });

  it("keeps an entry at exactly 15 MB", () => {
    const big = new Uint8Array(15 * MB).fill(0x61);
    const [file] = extractLetterboxdCsvs(makeZip({ "diary.csv": big }));
    expect(file.text).toHaveLength(15 * MB);
  });

  it("falls back to a smaller copy when the shallow one is oversized", () => {
    const big = new Uint8Array(15 * MB + 1).fill(0x61);
    const [file] = extractLetterboxdCsvs(
      makeZip({ "diary.csv": big, "nested/diary.csv": DIARY }),
    );
    expect(file.path).toBe("nested/diary.csv");
  });

  it("rejects allowlisted CSVs totalling more than 40 MB", () => {
    const chunk = new Uint8Array(14 * MB).fill(0x61);
    expect(() =>
      extractLetterboxdCsvs(
        makeZip({
          "a/diary.csv": chunk,
          "b/diary.csv": chunk,
          "c/diary.csv": chunk,
        }),
      ),
    ).toThrow("Zip uncompressed size exceeds limit");
  });

  it("does not count skipped trees toward the 40 MB total", () => {
    const chunk = new Uint8Array(14 * MB).fill(0x61);
    const files = extractLetterboxdCsvs(
      makeZip({
        "deleted/diary.csv": chunk,
        "orphaned/diary.csv": chunk,
        "__macosx/diary.csv": chunk,
        "diary.csv": DIARY,
      }),
    );
    expect(files[0].text).toBe(DIARY);
  });
});

describe("isZipBuffer", () => {
  it.each([
    ["local header", [0x50, 0x4b, 0x03, 0x04]],
    ["central header", [0x50, 0x4b, 0x01, 0x02]],
    ["empty archive", [0x50, 0x4b, 0x05, 0x06]],
  ])("detects %s magic with any name", (_label, bytes) => {
    expect(isZipBuffer(Buffer.from(bytes), "diary.csv")).toBe(true);
  });

  it.each([
    ["unknown PK variant", [0x50, 0x4b, 0x07, 0x08]],
    ["short buffer", [0x50, 0x4b]],
    ["empty buffer", []],
    ["plain text", [0x4e, 0x61, 0x6d, 0x65]],
  ])("does not detect %s", (_label, bytes) => {
    expect(isZipBuffer(Buffer.from(bytes), "diary.csv")).toBe(false);
    expect(isZipBuffer(Buffer.from(bytes))).toBe(false);
  });

  it.each(["export.zip", "EXPORT.ZIP"])(
    "trusts the %s extension",
    (name) => {
      expect(isZipBuffer(Buffer.from("Name\n"), name)).toBe(true);
    },
  );
});

describe("inferLetterboxdKindFromFileName", () => {
  it.each([
    [undefined, "diary"],
    ["", "diary"],
    ["export.csv", "diary"],
    ["RATINGS.CSV", "ratings"],
    ["folder/watched.csv", "watched"],
    ["folder\\watchlist.csv", "watchlist"],
    ["watchlist.csv/", "diary"],
    ["my-ratings.csv", "diary"],
  ])("maps %j to %s", (name, kind) => {
    expect(inferLetterboxdKindFromFileName(name)).toBe(kind);
  });
});

describe("parseIncludeKinds", () => {
  it.each([
    [undefined, undefined],
    [null, undefined],
    ["", undefined],
    ["  ", undefined],
    [",,+", undefined],
    ["profile", undefined],
    ["__proto__,constructor", undefined],
    ["DIARY", ["diary"]],
    ["diary+ratings", ["diary", "ratings"]],
    ["diary ratings\twatched", ["diary", "ratings", "watched"]],
    ["diary,bogus,watchlist", ["diary", "watchlist"]],
    [["diary", "ratings"], ["diary", "ratings"]],
    [["diary,watched", "watchlist"], ["diary", "watched", "watchlist"]],
    [[], undefined],
  ])("parses %j", (raw, expected) => {
    expect(parseIncludeKinds(raw as string | string[] | null | undefined)).toEqual(
      expected,
    );
  });
});
