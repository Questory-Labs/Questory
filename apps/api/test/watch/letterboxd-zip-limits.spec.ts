import { describe, expect, it } from "vitest";
import { Zip, ZipDeflate, deflateSync, strToU8, zipSync } from "fflate";
import { extractLetterboxdCsvs } from "../../src/watch/imports/letterboxd-zip";

const MB = 1024 * 1024;
const CSV = "Name,Year\nFilm,2020\n";

type RawEntry = {
  name: string;
  body: Uint8Array;
  method?: number;
  declaredSize: number;
  localName?: string;
};

function rawZip(entries: RawEntry[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const method = entry.method ?? 8;
    const centralName = Buffer.from(entry.name);
    const localName = Buffer.from(entry.localName ?? entry.name);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(method, 8);
    local.writeUInt32LE(entry.body.length, 18);
    local.writeUInt32LE(entry.declaredSize, 22);
    local.writeUInt16LE(localName.length, 26);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(entry.body.length, 20);
    central.writeUInt32LE(entry.declaredSize, 24);
    central.writeUInt16LE(centralName.length, 28);
    central.writeUInt32LE(offset, 42);

    locals.push(local, localName, Buffer.from(entry.body));
    centrals.push(central, centralName);
    offset += local.length + localName.length + entry.body.length;
  }

  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

function bomb(bytes: number): Uint8Array {
  return deflateSync(new Uint8Array(bytes).fill(0x41));
}

function honest(name: string, text = CSV): RawEntry {
  const data = strToU8(text);
  return { name, body: deflateSync(data), declaredSize: data.length };
}

function streamedZip(files: Record<string, string>): Buffer {
  const parts: Uint8Array[] = [];
  const zip = new Zip((err, chunk) => {
    if (err) throw err;
    parts.push(chunk);
  });
  for (const [name, text] of Object.entries(files)) {
    const entry = new ZipDeflate(name);
    zip.add(entry);
    entry.push(strToU8(text), true);
  }
  zip.end();
  return Buffer.concat(parts);
}

describe("extractLetterboxdCsvs real inflated size limits", () => {
  it("rejects an entry whose declared size understates its real size", () => {
    const buffer = rawZip([
      { name: "diary.csv", body: bomb(16 * MB), declaredSize: 10 },
    ]);
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "diary.csv exceeds size limit",
    );
  });

  it("rejects an oversized entry that declares a zero size", () => {
    const buffer = rawZip([
      { name: "ratings.csv", body: bomb(16 * MB), declaredSize: 0 },
    ]);
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "ratings.csv exceeds size limit",
    );
  });

  it("enforces the total limit against real bytes across entries", () => {
    const buffer = rawZip([
      { name: "diary.csv", body: bomb(14 * MB), declaredSize: 1 },
      { name: "ratings.csv", body: bomb(14 * MB), declaredSize: 1 },
      { name: "watched.csv", body: bomb(14 * MB), declaredSize: 1 },
    ]);
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "Zip uncompressed size exceeds limit",
    );
  });

  it("keeps real bytes when the declared size overstates them", () => {
    const data = strToU8(CSV);
    const buffer = rawZip([
      { name: "diary.csv", body: deflateSync(data), declaredSize: 10 * MB },
    ]);
    expect(extractLetterboxdCsvs(buffer)[0].text).toBe(CSV);
  });

  it("does not inflate a lying entry that loses to a shallower path", () => {
    const buffer = rawZip([
      { name: "backup/old/diary.csv", body: bomb(32 * MB), declaredSize: 1 },
      honest("diary.csv"),
    ]);
    expect(extractLetterboxdCsvs(buffer)).toEqual([
      { kind: "diary", path: "diary.csv", text: CSV },
    ]);
  });

  it("does not inflate an excluded kind", () => {
    const buffer = rawZip([
      { name: "watchlist.csv", body: bomb(32 * MB), declaredSize: 1 },
      honest("diary.csv"),
    ]);
    expect(extractLetterboxdCsvs(buffer, ["diary"]).map((f) => f.kind)).toEqual(
      ["diary"],
    );
  });
});

describe("extractLetterboxdCsvs entry filtering before inflation", () => {
  it("ignores a non-allowlisted entry with an unknown compression method", () => {
    const buffer = rawZip([
      { name: "poster.bin", body: Buffer.from("junk"), method: 99, declaredSize: 4 },
      honest("diary.csv"),
    ]);
    expect(extractLetterboxdCsvs(buffer)[0].text).toBe(CSV);
  });

  it("ignores a non-allowlisted entry with corrupt deflate data", () => {
    const buffer = rawZip([
      { name: "notes.txt", body: Buffer.from([0xff, 0xff, 0xff]), declaredSize: 9 },
      honest("diary.csv"),
    ]);
    expect(extractLetterboxdCsvs(buffer)[0].text).toBe(CSV);
  });

  it("ignores a corrupt entry in a skipped tree", () => {
    const buffer = rawZip([
      { name: "deleted/diary.csv", body: Buffer.from([0xff]), declaredSize: 9 },
      honest("diary.csv"),
    ]);
    expect(extractLetterboxdCsvs(buffer)[0].path).toBe("diary.csv");
  });

  it("reports too many entries before touching their contents", () => {
    const entries: RawEntry[] = Array.from({ length: 257 }, (_, i) => ({
      name: `f${i}.bin`,
      body: Buffer.from("x"),
      method: 99,
      declaredSize: 1,
    }));
    expect(() => extractLetterboxdCsvs(rawZip(entries))).toThrow(
      "Zip has too many entries (max 256)",
    );
  });

  it("allows exactly the maximum entry count", () => {
    const entries: RawEntry[] = Array.from({ length: 255 }, (_, i) => ({
      name: `f${i}.bin`,
      body: Buffer.from("x"),
      method: 99,
      declaredSize: 1,
    }));
    const buffer = rawZip([...entries, honest("diary.csv")]);
    expect(extractLetterboxdCsvs(buffer)).toHaveLength(1);
  });
});

describe("extractLetterboxdCsvs fails closed on bad selected entries", () => {
  it("rejects a selected entry with an unknown compression method", () => {
    const buffer = rawZip([
      { name: "diary.csv", body: strToU8(CSV), method: 99, declaredSize: CSV.length },
    ]);
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "Invalid or corrupted zip archive",
    );
  });

  it("rejects a selected entry with corrupt deflate data", () => {
    const buffer = rawZip([
      { name: "diary.csv", body: Buffer.from([0xff, 0xff, 0xff]), declaredSize: 9 },
    ]);
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "Invalid or corrupted zip archive",
    );
  });

  it("rejects when the local header name disagrees with the directory", () => {
    const entry = honest("diary.csv");
    const buffer = rawZip([{ ...entry, localName: "other.csv" }]);
    expect(() => extractLetterboxdCsvs(buffer)).toThrow(
      "Invalid or corrupted zip archive",
    );
  });
});

describe("extractLetterboxdCsvs valid archive shapes", () => {
  it("extracts stored entries", () => {
    const buffer = Buffer.from(
      zipSync({ "diary.csv": [strToU8(CSV), { level: 0 }] }),
    );
    expect(extractLetterboxdCsvs(buffer)[0].text).toBe(CSV);
  });

  it("extracts entries from a streamed data-descriptor zip", () => {
    const buffer = streamedZip({
      "extra.txt": "ignored",
      "export/diary.csv": CSV,
      "export/ratings.csv": "Name,Rating\nFilm,4\n",
    });
    expect(extractLetterboxdCsvs(buffer)).toEqual([
      { kind: "diary", path: "export/diary.csv", text: CSV },
      {
        kind: "ratings",
        path: "export/ratings.csv",
        text: "Name,Rating\nFilm,4\n",
      },
    ]);
  });

  it("extracts an empty selected entry", () => {
    const buffer = Buffer.from(zipSync({ "diary.csv": new Uint8Array(0) }));
    expect(extractLetterboxdCsvs(buffer)[0].text).toBe("");
  });

  it("assembles multibyte text across inflate chunks", () => {
    const text = `Name\n${"Amélie 千と千尋\n".repeat(200_000)}`;
    const buffer = Buffer.from(zipSync({ "diary.csv": strToU8(text) }));
    expect(extractLetterboxdCsvs(buffer)[0].text).toBe(text);
  });
});
