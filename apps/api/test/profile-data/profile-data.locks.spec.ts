import { describe, expect, it } from "vitest";
import { isPrismaAdmissionConflict } from "../../src/profile-data/profile-data.locks";

describe("isPrismaAdmissionConflict", () => {
  it("treats unique and serialization failures as admission conflicts", () => {
    expect(isPrismaAdmissionConflict({ code: "P2002" })).toBe(true);
    expect(isPrismaAdmissionConflict({ code: "P2034" })).toBe(true);
    expect(isPrismaAdmissionConflict({ code: "P2025" })).toBe(false);
    expect(isPrismaAdmissionConflict(new Error("nope"))).toBe(false);
  });
});
