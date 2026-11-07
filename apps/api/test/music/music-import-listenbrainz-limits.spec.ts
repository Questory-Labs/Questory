import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { parseListenBrainzZip } from "../../src/music/imports/parsers/listenbrainz";

const GIB = 1024 * 1024 * 1024;
const line = (track: string) =>
  JSON.stringify({
    listened_at: 1700000000,
    track_metadata: { artist_name: "A", track_name: track },
  });

function setCentralSizes(
  zip: Uint8Array,
  sizes: Record<string, number>,
): Buffer {
  const out = Buffer.from(zip);
  for (let i = 0; i + 46 <= out.length; i += 1) {
    if (out.readUInt32LE(i) !== 0x02014b50) continue;
    const nameLength = out.readUInt16LE(i + 28);
    const name = out.subarray(i + 46, i + 46 + nameLength).toString();
    if (name in sizes) out.writeUInt32LE(sizes[name], i + 24);
  }
  return out;
}

describe("parseListenBrainzZip inflation limit", () => {
  it("rejects an entry declaring more than 1 GiB", () => {
    const zip = zipSync({ "listens/a.jsonl": strToU8(line("T")) });
    const forged = setCentralSizes(zip, { "listens/a.jsonl": GIB + 1 });
    expect(() => parseListenBrainzZip(forged)).toThrow(
      "ListenBrainz export is too large to import",
    );
  });

  it("sums the limit across entries", () => {
    const zip = zipSync({
      "listens/a.jsonl": strToU8(line("A")),
      "listens/b.jsonl": strToU8(line("B")),
      "listens/c.jsonl": strToU8(line("C")),
    });
    const forged = setCentralSizes(zip, {
      "listens/a.jsonl": 500 * 1024 * 1024,
      "listens/b.jsonl": 500 * 1024 * 1024,
      "listens/c.jsonl": 500 * 1024 * 1024,
    });
    expect(() => parseListenBrainzZip(forged)).toThrow(/too large/);
  });

  it("never inflates past the declared size of a lying entry", () => {
    const real = Array.from({ length: 2000 }, (_, i) => line(`T${i}`)).join("\n");
    const zip = zipSync({ "listens/a.jsonl": strToU8(real) });
    const firstLine = Buffer.byteLength(line("T0"));
    const forged = setCentralSizes(zip, { "listens/a.jsonl": firstLine });
    const rows = parseListenBrainzZip(forged);
    expect(rows.map((r) => r.trackName)).toEqual(["T0"]);
  });

  it("does not count or inflate entries outside listens", () => {
    const zip = zipSync({
      "listens/a.jsonl": strToU8(line("T")),
      "feedback/huge.bin": strToU8("x".repeat(100)),
    });
    const forged = setCentralSizes(zip, { "feedback/huge.bin": 4 * GIB - 2 });
    expect(parseListenBrainzZip(forged)).toHaveLength(1);
  });

  it("ignores an unsupported compression outside listens", () => {
    const zip = zipSync({
      "listens/a.jsonl": strToU8(line("T")),
      "other.bin": strToU8("payload"),
    });
    const out = Buffer.from(zip);
    for (let i = 0; i + 46 <= out.length; i += 1) {
      if (out.readUInt32LE(i) !== 0x02014b50) continue;
      const nameLength = out.readUInt16LE(i + 28);
      if (out.subarray(i + 46, i + 46 + nameLength).toString() === "other.bin") {
        out.writeUInt16LE(14, i + 10);
      }
    }
    expect(parseListenBrainzZip(out)).toHaveLength(1);
  });

  it("imports a single file with more listens than fit in call arguments", () => {
    const body = Array.from({ length: 200000 }, () => line("T")).join("\n");
    const zip = zipSync({ "listens/a.jsonl": strToU8(body) });
    expect(parseListenBrainzZip(Buffer.from(zip))).toHaveLength(200000);
  });

  it("imports an export under the limit", () => {
    const zip = zipSync({
      "listens/a.jsonl": strToU8(line("A")),
      "listens/b.jsonl": strToU8(line("B")),
    });
    expect(parseListenBrainzZip(Buffer.from(zip))).toHaveLength(2);
  });
});
