import { describe, expect, it, afterEach } from "vitest";
import {
  isAdminEmail,
  isEffectiveAdmin,
  resolveAdminEmails,
} from "../../src/auth/admin-emails";

describe("ADMIN_EMAILS", () => {
  const prev = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = prev;
  });

  it("parses and matches emails", () => {
    process.env.ADMIN_EMAILS = "Admin@Example.com, other@x.test";
    expect(resolveAdminEmails().has("admin@example.com")).toBe(true);
    expect(isAdminEmail("ADMIN@example.com")).toBe(true);
    expect(isAdminEmail("nope@x.test")).toBe(false);
  });

  it("effective admin ORs db flag and env", () => {
    process.env.ADMIN_EMAILS = "boss@example.com";
    expect(isEffectiveAdmin({ isAdmin: true, email: "a@b.c" })).toBe(true);
    expect(
      isEffectiveAdmin({ isAdmin: false, email: "boss@example.com" }),
    ).toBe(true);
    expect(isEffectiveAdmin({ isAdmin: false, email: "a@b.c" })).toBe(false);
  });
});
