import { describe, expect, it } from "vitest";
import { filterUsers, syncSummary, userInitial } from "./admin.users.utils";
import type { AdminUser } from "./admin.users.types";

const base: AdminUser = {
  id: "u1",
  email: "alice@example.com",
  isAdmin: false,
  personaName: "alice",
  steamId: "765",
  createdAt: "2026-01-01T00:00:00.000Z",
  lastSyncedAt: null,
};

describe("admin users utils", () => {
  const now = new Date("2026-01-01T03:00:00.000Z").getTime();

  it("summarises sync state", () => {
    expect(syncSummary(base, now)).toEqual({ failed: false, label: "Never" });
    expect(
      syncSummary({ ...base, lastSyncedAt: "2026-01-01T01:00:00.000Z" }, now).label,
    ).toBe("2 h ago");
    expect(
      syncSummary(
        { ...base, latestSync: { status: "failed", type: "library-sync", at: "2026-01-01T00:00:00.000Z" } },
        now,
      ),
    ).toEqual({ failed: true, label: "Failed · 3 h ago" });
  });

  it("filters by email, name or steam id", () => {
    const bob = { ...base, id: "u2", email: "bob@x.io", personaName: "Bob", steamId: null };
    expect(filterUsers([base, bob], "")).toHaveLength(2);
    expect(filterUsers([base, bob], "BOB")).toEqual([bob]);
    expect(filterUsers([base, bob], "765")).toEqual([base]);
  });

  it("derives an initial", () => {
    expect(userInitial(base)).toBe("A");
  });
});
