import { describe, expect, it, vi } from "vitest";
import { QmonitorDevicesService } from "../../src/qmonitor/qmonitor-devices.service";

describe("QmonitorDevicesService.list", () => {
  it("lists active devices before revoked ones", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new QmonitorDevicesService({
      qmonitorDeviceSession: { findMany },
    } as never);
    await service.list("u1");
    expect(findMany.mock.calls[0]![0].orderBy).toEqual([
      { revokedAt: { sort: "asc", nulls: "first" } },
      { lastUsedAt: "desc" },
    ]);
  });
});
