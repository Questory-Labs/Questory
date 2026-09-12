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
} from "../../src/profile-data/profile-zip";

describe("profile zip", () => {
  it("round-trips the profile JSON member", () => {
    const json = JSON.stringify({
      format: QUESTORY_PROFILE_FORMAT,
      version: QUESTORY_PROFILE_VERSION,
      exportedAt: "2026-08-29T12:00:00.000Z",
    });
    const zip = zipProfileArchive(json, "readme");
    expect(unzipProfileArchiveJson(zip)).toBe(json);
  });

  it("rejects a zip without questory-profile.json", () => {
    const packed = zipSync({ "notes.txt": strToU8("hi") });
    expect(() => unzipProfileArchiveJson(Buffer.from(packed))).toThrow(
      /must contain/,
    );
  });
});
