import { describe, expect, it } from "vitest";
import {
  MeResponseSchema,
  MultiplayerPlanRequestSchema,
  UserSchema,
} from "./index";

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

  it("accepts a signed-out me payload", () => {
    const parsed = MeResponseSchema.safeParse({ user: null });
    expect(parsed.success).toBe(true);
  });

  it("accepts a me payload with price region fields", () => {
    const parsed = MeResponseSchema.safeParse({
      user: {
        id: "u3",
        steamId: "76561198000000000",
        personaName: "Alice",
        avatarUrl: null,
        profileUrl: null,
        countryCode: "IN",
        currency: "INR",
        priceRegionLocked: true,
      },
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
