import { describe, expect, it, vi, afterEach } from "vitest";
import { ApiClient } from "../src/api-client";

describe("cron ApiClient", () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env = { ...prev };
    vi.unstubAllGlobals();
  });

  it("refuses to call when CRON_SECRET missing", async () => {
    delete process.env.CRON_SECRET;
    const client = new ApiClient();
    await expect(client.postInternal("/internal/cron/daily-refresh")).rejects.toThrow(
      /CRON_SECRET/,
    );
  });

  it("sends Bearer authorization", async () => {
    process.env.CRON_SECRET = "cron-test-secret";
    process.env.API_INTERNAL_URL = "http://api.test";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "{}",
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new ApiClient();
    await client.postInternal("/internal/cron/daily-refresh");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/v1/internal/cron/daily-refresh",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer cron-test-secret",
        }),
      }),
    );
  });
});
