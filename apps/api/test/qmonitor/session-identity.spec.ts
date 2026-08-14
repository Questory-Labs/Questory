import { describe, expect, it } from "vitest";
import {
  normalizeExe,
  normalizeTitle,
  sessionMatchIdentity,
  sessionMatchesIdentity,
} from "../../src/qmonitor/session-identity";

describe("session-identity", () => {
  it("normalizes exe to lowercase basename", () => {
    expect(normalizeExe("dota2.exe")).toBe("dota2.exe");
    expect(normalizeExe("C:\\\\Games\\\\Dota2.exe")).toBe("dota2.exe");
    expect(normalizeExe("/opt/steam/dota2.exe")).toBe("dota2.exe");
    expect(normalizeExe("  ")).toBe("");
    expect(normalizeExe(null)).toBe("");
  });

  it("normalizes titles", () => {
    expect(normalizeTitle("  Cool   Game ")).toBe("cool game");
  });

  it("prefers exe identity when exe is present", () => {
    const identity = sessionMatchIdentity("dota2.exe", "Dota 2");
    expect(identity.matchKind).toBe("exe");
    expect(identity.matchKey).toBe("exe:dota2.exe");
    expect(
      sessionMatchesIdentity("C:/steam/dota2.exe", "Something Else", identity),
    ).toBe(true);
    expect(sessionMatchesIdentity("hl2.exe", "Dota 2", identity)).toBe(false);
  });

  it("falls back to title when exe is missing", () => {
    const identity = sessionMatchIdentity(null, "Cool Game");
    expect(identity.matchKind).toBe("title");
    expect(identity.matchKey).toBe("title:cool game");
    expect(sessionMatchesIdentity(null, "cool   game", identity)).toBe(true);
    expect(sessionMatchesIdentity("game.exe", "Cool Game", identity)).toBe(
      false,
    );
  });
});
