import { describe, expect, it } from "vitest";
import { friendInitial, friendPresence } from "./steam.friends.utils";

const now = new Date("2026-10-27T12:00:00Z");

describe("friendPresence", () => {
  it("shows the current game when in game", () => {
    expect(
      friendPresence(
        { personaState: 1, currentGameName: "Hades II", lastLogoffAt: null },
        now,
      ),
    ).toEqual({ label: "In game · Hades II", tone: "online", live: true });
  });

  it("maps away states", () => {
    expect(friendPresence({ personaState: 3 }, now)?.label).toBe("Away");
    expect(friendPresence({ personaState: 2 }, now)?.tone).toBe("away");
  });

  it("treats other positive states as online", () => {
    expect(friendPresence({ personaState: 6 }, now)?.label).toBe("Online");
  });

  it("uses last logoff when offline", () => {
    expect(
      friendPresence(
        { personaState: 0, lastLogoffAt: "2026-10-27T10:00:00Z" },
        now,
      )?.label,
    ).toBe("Last online 2h ago");
  });

  it("returns null when presence was never synced", () => {
    expect(friendPresence({}, now)).toBeNull();
  });

  it("builds an initial", () => {
    expect(friendInitial(" gaben")).toBe("G");
    expect(friendInitial("")).toBe("?");
  });
});
