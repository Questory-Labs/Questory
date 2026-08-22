import { describe, expect, it } from "vitest";
import { isMusicImportFile } from "./music.settings.utils";

describe("isMusicImportFile", () => {
  it("accepts known music export extensions", () => {
    expect(isMusicImportFile({ name: "koito.db", type: "" } as File)).toBe(true);
    expect(isMusicImportFile({ name: "recenttracks.json", type: "application/json" } as File)).toBe(true);
    expect(isMusicImportFile({ name: "notes.txt", type: "text/plain" } as File)).toBe(false);
  });
});
