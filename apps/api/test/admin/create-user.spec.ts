import { beforeEach, describe, expect, it, vi } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { AdminService } from "../../src/admin/admin.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("AdminService.createUser", () => {
  const findUnique = vi.fn();
  const create = vi.fn();

  let service: AdminService;

  beforeEach(() => {
    findUnique.mockReset().mockResolvedValue(null);
    create.mockReset().mockResolvedValue({
      id: "user-1",
      email: "new@example.com",
      isAdmin: false,
      personaName: "New User",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const prisma = {
      user: { findUnique, create },
    } as unknown as PrismaService;

    service = new AdminService(
      prisma,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it("creates a user with username, email, and password", async () => {
    const result = await service.createUser({
      personaName: "New User",
      email: "new@example.com",
      password: "password1234",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new@example.com",
        personaName: "New User",
        passwordHash: expect.any(String),
      }),
    });
    expect(result.user.personaName).toBe("New User");
    expect(result.user.email).toBe("new@example.com");
  });

  it("rejects duplicate email", async () => {
    findUnique.mockResolvedValue({ id: "existing" });

    await expect(
      service.createUser({
        personaName: "Dup",
        email: "new@example.com",
        password: "password1234",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
