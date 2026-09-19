import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { describe, expect, it } from "vitest";
import {
  QUESTORY_PROFILE_FORMAT,
  QUESTORY_PROFILE_JSON_NAME,
  QUESTORY_PROFILE_VERSION,
} from "@questorylabs/shared";
import { zipSync, strToU8 } from "fflate";
import {
  unzipProfileArchiveJson,
  zipProfileArchive,
  zipProfileArchiveToPath,
} from "../../src/profile-data/profile-zip";

const json = JSON.stringify({
  format: QUESTORY_PROFILE_FORMAT,
  version: QUESTORY_PROFILE_VERSION,
  exportedAt: "2026-08-29T12:00:00.000Z",
});

describe("profile zip", () => {
  it("round-trips the profile JSON member", () => {
    const zip = zipProfileArchive(json, "readme");
    expect(unzipProfileArchiveJson(zip)).toBe(json);
  });

  it("streams JSON and README into a zip file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "profile-zip-"));
    const jsonPath = join(dir, QUESTORY_PROFILE_JSON_NAME);
    const zipPath = join(dir, "out.zip");
    try {
      await writeFile(jsonPath, json);
      await zipProfileArchiveToPath(jsonPath, "readme", zipPath);
      const zip = await readFile(zipPath);
      expect(unzipProfileArchiveJson(zip)).toBe(json);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects a zip without questory-profile.json", () => {
    const packed = zipSync({ "notes.txt": strToU8("hi") });
    expect(() => unzipProfileArchiveJson(Buffer.from(packed))).toThrow(
      /must contain/,
    );
  });

  it("rejects a zip that exceeds the entry cap before extra members inflate", () => {
    const members: Record<string, Uint8Array> = {
      [QUESTORY_PROFILE_JSON_NAME]: strToU8(json),
    };
    for (let i = 0; i < 16; i += 1) {
      members[`extra-${i}.txt`] = strToU8("x");
    }
    const packed = zipSync(members);
    expect(() => unzipProfileArchiveJson(Buffer.from(packed))).toThrow(
      /too many entries/,
    );
  });
});
