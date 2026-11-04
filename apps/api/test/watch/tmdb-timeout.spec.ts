import { beforeEach, describe, expect, it, vi } from "vitest";
import { TmdbService } from "../../src/watch/tmdb/tmdb.service";

const { providerFetch } = vi.hoisted(() => ({ providerFetch: vi.fn() }));
vi.mock("../../src/lib/qhttp-outbound", () => ({ providerFetch }));
vi.mock("../../src/watch/lib/runtime-config", () => ({ resolveTmdbApiKey: () => "key" }));

describe("TmdbService", () => {
  beforeEach(() => {
    providerFetch.mockReset();
  });

  it("bounds every request with a timeout signal", async () => {
    providerFetch.mockResolvedValue(
      new Response(JSON.stringify({ id: 1 }), { status: 200 }),
    );
    await new TmdbService().getMovie(1);
    const init = providerFetch.mock.calls[0]![1] as RequestInit;
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns null when the request times out", async () => {
    providerFetch.mockRejectedValue(new DOMException("timed out", "TimeoutError"));
    await expect(new TmdbService().getMovie(1)).resolves.toBeNull();
  });
});
