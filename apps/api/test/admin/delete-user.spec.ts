import { beforeEach, describe, expect, it, vi } from "vitest";
import { HttpException, ServiceUnavailableException } from "@nestjs/common";
import { AdminService } from "../../src/admin/admin.service";
import type { EnterpriseProxyService } from "../../src/enterprise/enterprise-proxy.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("AdminService.deleteUser", () => {
  const findUnique = vi.fn();
  const remove = vi.fn();
  const forward = vi.fn();
  const configDelete = vi.fn();

  function build(enterprise?: EnterpriseProxyService) {
    const prisma = {
      user: { findUnique, delete: remove, count: vi.fn() },
      appConfig: { deleteMany: configDelete },
    } as unknown as PrismaService;
    const none = {} as never;
    return new AdminService(
      prisma,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      none,
      null,
      enterprise,
    );
  }

  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue({ id: "u1", isAdmin: false });
    remove.mockReset().mockResolvedValue({ id: "u1" });
    forward.mockReset().mockResolvedValue({ ok: true });
    configDelete.mockReset().mockResolvedValue({ count: 1 });
  });

  it("removes the user's recap setting", async () => {
    const service = build();
    await service.deleteUser("u1");
    expect(configDelete).toHaveBeenCalledWith({ where: { key: "recap.monthly.user:u1" } });
  });

  it("erases the user's QEngine data", async () => {
    const service = build({ forward } as unknown as EnterpriseProxyService);
    await expect(service.deleteUser("u1")).resolves.toEqual({ ok: true });
    expect(remove).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(forward).toHaveBeenCalledWith({
      userId: "u1",
      isAdmin: true,
      method: "DELETE",
      path: "/v1/enterprise/users/u1",
    });
  });

  it("erases QEngine data before deleting the account", async () => {
    const order: string[] = [];
    forward.mockImplementation(async () => order.push("erase"));
    remove.mockImplementation(async () => order.push("delete"));
    const service = build({ forward } as unknown as EnterpriseProxyService);
    await service.deleteUser("u1");
    expect(order).toEqual(["erase", "delete"]);
  });

  it("keeps the account when QEngine rejects the erase", async () => {
    forward.mockRejectedValue(new HttpException("boom", 500));
    const service = build({ forward } as unknown as EnterpriseProxyService);
    await expect(service.deleteUser("u1")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(remove).not.toHaveBeenCalled();
  });

  it("keeps the account when a configured QEngine is unreachable", async () => {
    vi.stubEnv("ENTERPRISE_URL", "http://qengine:4030");
    forward.mockRejectedValue(new ServiceUnavailableException("Enterprise service unavailable"));
    const service = build({ forward } as unknown as EnterpriseProxyService);
    await expect(service.deleteUser("u1")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(remove).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("still deletes when QEngine is not configured and unreachable", async () => {
    vi.stubEnv("ENTERPRISE_URL", "");
    forward.mockRejectedValue(new ServiceUnavailableException("Enterprise service unavailable"));
    const service = build({ forward } as unknown as EnterpriseProxyService);
    await expect(service.deleteUser("u1")).resolves.toEqual({ ok: true });
    expect(remove).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });

  it("works without the enterprise module", async () => {
    const service = build();
    await expect(service.deleteUser("u1")).resolves.toEqual({ ok: true });
  });
});
