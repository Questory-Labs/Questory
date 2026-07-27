import { describe, expect, it } from "vitest";
import { MultiplayerPlanRequestSchema, UserSchema } from "./index";

describe("shared zod schemas", () => {
  it("accepts a valid user", () => {
    const parsed = UserSchema.safeParse({
      id: "u1",
      steamId: "76561198000000000",
      personaName: "Alice",
      avatarUrl: null,
      profileUrl: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("accepts a user without Steam", () => {
    const parsed = UserSchema.safeParse({
      id: "u2",
      steamId: null,
      personaName: "MusicOnly",
      avatarUrl: null,
      profileUrl: null,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects malformed multiplayer plan", () => {
    const parsed = MultiplayerPlanRequestSchema.safeParse({
      friendSteamIds: "not-an-array",
      minPlayers: 0,
    });
    expect(parsed.success).toBe(false);
  });
});
