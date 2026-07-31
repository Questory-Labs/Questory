import { describe, expect, it } from "vitest";
import { readUrl } from "./read";

describe("readUrl", () => {
  it("prefixes manga list provider routes under /v1/read", () => {
    expect(readUrl("/mal/status")).toMatch(/\/v1\/read\/mal\/status$/);
    expect(readUrl("/shikimori/authorize")).toMatch(
      /\/v1\/read\/shikimori\/authorize$/,
    );
    expect(readUrl("/bangumi/status")).toMatch(/\/v1\/read\/bangumi\/status$/);
    expect(readUrl("/kitsu/connect")).toMatch(/\/v1\/read\/kitsu\/connect$/);
    expect(readUrl("/anilist/status")).toMatch(/\/v1\/read\/anilist\/status$/);
  });
});
