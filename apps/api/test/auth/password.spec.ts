import { describe, expect, it } from "vitest";
import {
  dummyPasswordVerify,
  hashPassword,
  verifyPassword,
} from "../../src/auth/password";

describe("password hashing", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("correct-horse-battery");
    expect(await verifyPassword(hash, "correct-horse-battery")).toBe(true);
    expect(await verifyPassword(hash, "wrong-password!!")).toBe(false);
  });

  it("dummy verify does not throw", async () => {
    await expect(dummyPasswordVerify("anything-long")).resolves.toBeUndefined();
  });
});
