import { describe, expect, it } from "vitest";
import { watchUrl } from "./watch";

describe("watchUrl", () => {
  it("prefixes letterboxd routes under /v1/watch", () => {
    expect(watchUrl("/letterboxd/connect")).toMatch(
      /\/v1\/watch\/letterboxd\/connect$/,
    );
    expect(watchUrl("/letterboxd/status")).toMatch(
      /\/v1\/watch\/letterboxd\/status$/,
    );
  });

  it("prefixes anime list provider routes under /v1/watch", () => {
    expect(watchUrl("/mal/status")).toMatch(/\/v1\/watch\/mal\/status$/);
    expect(watchUrl("/shikimori/authorize")).toMatch(
      /\/v1\/watch\/shikimori\/authorize$/,
    );
    expect(watchUrl("/bangumi/status")).toMatch(
      /\/v1\/watch\/bangumi\/status$/,
    );
    expect(watchUrl("/kitsu/connect")).toMatch(/\/v1\/watch\/kitsu\/connect$/);
  });
});
