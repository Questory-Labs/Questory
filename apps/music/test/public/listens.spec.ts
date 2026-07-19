import { describe, expect, it } from "vitest";
import { extractToken } from "../../src/listenbrainz/token.guard";

describe("public listen surface", () => {
  it("extractToken never reads query token", () => {
    const req = {
      headers: {},
      query: { token: "leaked" },
    } as any;
    expect(extractToken(req)).toBeNull();
  });
});
