import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { EntitlementService } from "../../src/entitlements/entitlement.service";

describe("EntitlementService", () => {
  const prevCloud = process.env.QUESTORY_CLOUD;
  const cache = {
    getJson: vi.fn(async () => null),
    setJson: vi.fn(async () => undefined),
  };

  beforeEach(() => {
    cache.getJson.mockReset();
    cache.getJson.mockResolvedValue(null);
    cache.setJson.mockReset();
    delete process.env.QUESTORY_CLOUD;
  });

  afterEach(() => {
    if (prevCloud === undefined) delete process.env.QUESTORY_CLOUD;
    else process.env.QUESTORY_CLOUD = prevCloud;
  });

  function service(prisma: object) {
    return new EntitlementService(prisma as never, cache as never);
  }

  it("denies everyone when the instance flag is off", async () => {
    const prisma = {
      appConfig: {
        findUnique: vi.fn(async () => ({ value: "off" })),
      },
      user: {
        findUnique: vi.fn(async () => ({
          id: "u1",
          email: "admin@example.com",
          isAdmin: true,
        })),
      },
    };
    expect(await service(prisma).isAllowed("u1", "recommendations")).toBe(false);
  });

  it("allows admins when the instance flag is on", async () => {
    const prisma = {
      appConfig: {
        findUnique: vi.fn(async () => ({ value: "on" })),
      },
      user: {
        findUnique: vi.fn(async () => ({
          id: "u1",
          email: "admin@example.com",
          isAdmin: true,
        })),
      },
    };
    expect(await service(prisma).isAllowed("u1", "recommendations")).toBe(true);
  });

  it("allows self-host users when QEngine is available", async () => {
    cache.getJson.mockResolvedValue(true);
    const prisma = {
      appConfig: { findUnique: vi.fn(async () => null) },
      user: {
        findUnique: vi.fn(async () => ({
          id: "u1",
          email: "user@example.com",
          isAdmin: false,
        })),
      },
    };
    expect(await service(prisma).isAllowed("u1", "rewindAi")).toBe(true);
  });

  it("requires a per-user grant in QUESTORY_CLOUD", async () => {
    process.env.QUESTORY_CLOUD = "true";
    const prisma = {
      appConfig: { findUnique: vi.fn(async () => null) },
      user: {
        findUnique: vi.fn(async () => ({
          id: "u1",
          email: "user@example.com",
          isAdmin: false,
        })),
      },
      userEntitlement: {
        findUnique: vi.fn(async () => null),
      },
    };
    expect(await service(prisma).isAllowed("u1", "recommendations")).toBe(false);
    prisma.userEntitlement.findUnique.mockResolvedValue({
      userId: "u1",
      feature: "recommendations",
    });
    expect(await service(prisma).isAllowed("u1", "recommendations")).toBe(true);
  });
});
