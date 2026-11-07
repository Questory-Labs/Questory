import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/runtime-env", () => ({ getApiUrl: () => "http://api.test" }));

import { loadPublicRewindShare } from "./media.rewind-public.api";

const token = "abcdefghijklmnopqrstuvwxyz012345";

describe("loadPublicRewindShare", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("only asks the API to count a view when requested", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);
    await loadPublicRewindShare(token);
    await loadPublicRewindShare(token, { countView: true });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("view=1");
    expect(String(fetchMock.mock.calls[1][0])).toMatch(/\/share\/rewind\/[A-Za-z0-9]+\?view=1$/);
  });

  it("returns null for malformed tokens without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await loadPublicRewindShare("bad")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
