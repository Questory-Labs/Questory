import { describe, expect, it } from "vitest";
import { StoresService } from "../../src/stores/stores.service";

describe("token leakage", () => {
  it("store status responses never include access/refresh tokens", async () => {
    const service = new StoresService(
      {} as any,
      {} as any,
      {} as any,
    );
    const status = await service.listStatus("user-1");
    const serialized = JSON.stringify(status);
    expect(serialized.toLowerCase()).not.toContain("accesstoken");
    expect(serialized.toLowerCase()).not.toContain("refreshtoken");
    expect(serialized).not.toMatch(/tokenHash/i);
    expect(serialized).not.toMatch(/accessToken/i);
  });
});
