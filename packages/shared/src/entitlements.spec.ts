import { describe, expect, it } from "vitest";
import {
  EntitlementFeatureSchema,
  UserEntitlementsSchema,
} from "./entitlements";
import { AuthEmailSchema, AuthMeResponseSchema } from "./auth-public";

describe("entitlements schemas", () => {
  it("accepts known features", () => {
    expect(EntitlementFeatureSchema.parse("recommendations")).toBe(
      "recommendations",
    );
    expect(EntitlementFeatureSchema.parse("rewindAi")).toBe("rewindAi");
    expect(EntitlementFeatureSchema.safeParse("admin").success).toBe(false);
  });

  it("parses a me payload with entitlements", () => {
    const parsed = AuthMeResponseSchema.safeParse({
      user: {
        id: "u1",
        steamId: null,
        personaName: "Ada",
        avatarUrl: null,
        profileUrl: null,
        emailVerified: false,
      },
      mailActive: true,
      requireEmailVerification: true,
      entitlements: { recommendations: false, rewindAi: true },
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a bad magic-link email", () => {
    expect(AuthEmailSchema.safeParse({ email: "nope" }).success).toBe(false);
  });

  it("requires both entitlement booleans", () => {
    expect(UserEntitlementsSchema.safeParse({ recommendations: true }).success).toBe(
      false,
    );
  });
});
