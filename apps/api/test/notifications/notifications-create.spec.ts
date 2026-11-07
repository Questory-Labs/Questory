import { describe, expect, it, vi } from "vitest";
import { NotificationsService } from "../../src/notifications/notifications.service";
import type { PrismaService } from "../../src/prisma/prisma.service";

describe("NotificationsService.create", () => {
  it("persists first, then hands the row to delivery", async () => {
    const order: string[] = [];
    const create = vi.fn().mockImplementation(async ({ data }) => {
      order.push("persist");
      return { id: "n1", ...data };
    });
    const dispatch = vi.fn().mockImplementation(async () => {
      order.push("dispatch");
    });
    const service = new NotificationsService(
      { notification: { create } } as unknown as PrismaService,
      { dispatch } as never,
    );
    const row = await service.create("u1", {
      type: "deal",
      title: "Deal",
      body: "Buy now",
      href: "/wishlist",
      meta: { appId: 1 },
    });
    expect(order).toEqual(["persist", "dispatch"]);
    expect(create.mock.calls[0][0].data).toMatchObject({
      userId: "u1",
      type: "deal",
      meta: '{"appId":1}',
    });
    expect(dispatch).toHaveBeenCalledWith("u1", {
      type: "deal",
      title: "Deal",
      body: "Buy now",
      href: "/wishlist",
    });
    expect(row.id).toBe("n1");
  });
});
