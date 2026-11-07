import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }));
vi.mock("node:dns/promises", () => ({ lookup, default: { lookup } }));

import {
  assertPublicHttpsTarget,
  isBlockedAddress,
  postToPublicUrl,
} from "../../src/lib/outbound-url-guard";

const init = () => ({ headers: {}, body: "x", signal: new AbortController().signal });

describe("outbound url guard", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    delete process.env.NOTIFICATIONS_ALLOW_PRIVATE_HOSTS;
    lookup.mockReset();
    lookup.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.NOTIFICATIONS_ALLOW_PRIVATE_HOSTS;
  });

  it("classifies private, loopback, link-local, CGNAT and mapped addresses", () => {
    for (const a of [
      "127.0.0.1",
      "10.1.2.3",
      "172.20.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
      "::ffff:7f00:1",
      "not-an-ip",
    ]) {
      expect(isBlockedAddress(a), a).toBe(true);
    }
    expect(isBlockedAddress("93.184.216.34")).toBe(false);
    expect(isBlockedAddress("2606:4700::1111")).toBe(false);
  });

  it("rejects non-https, credentials, literal private IPs and private DNS answers", async () => {
    await expect(assertPublicHttpsTarget("http://ntfy.sh")).rejects.toThrow(/https/);
    await expect(assertPublicHttpsTarget("https://u:p@ntfy.sh")).rejects.toThrow(/credentials/);
    await expect(assertPublicHttpsTarget("https://127.0.0.1/x")).rejects.toThrow(/not allowed/);
    await expect(assertPublicHttpsTarget("https://[::1]/x")).rejects.toThrow(/not allowed/);
    lookup.mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
      { address: "10.0.0.1", family: 4 },
    ]);
    await expect(assertPublicHttpsTarget("https://evil.example")).rejects.toThrow(/not allowed/);
    lookup.mockRejectedValueOnce(new Error("ENOTFOUND"));
    await expect(assertPublicHttpsTarget("https://nx.example")).rejects.toThrow(/resolved/);
  });

  it("allows private hosts only when the opt-in is set", async () => {
    lookup.mockResolvedValue([{ address: "192.168.1.10", family: 4 }]);
    await expect(assertPublicHttpsTarget("https://ntfy.lan")).rejects.toThrow(/not allowed/);
    process.env.NOTIFICATIONS_ALLOW_PRIVATE_HOSTS = "true";
    await expect(assertPublicHttpsTarget("https://ntfy.lan")).resolves.toBeInstanceOf(URL);
    await expect(assertPublicHttpsTarget("http://ntfy.lan")).rejects.toThrow(/https/);
  });

  it("posts with manual redirects and refuses 3xx responses", async () => {
    await postToPublicUrl("https://ntfy.sh/t", init());
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", redirect: "manual" });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 302 });
    await expect(postToPublicUrl("https://ntfy.sh/t", init())).rejects.toThrow(/redirects/);
  });

  it("does not fetch when the target is blocked", async () => {
    lookup.mockResolvedValueOnce([{ address: "127.0.0.1", family: 4 }]);
    await expect(postToPublicUrl("https://localtest.me", init())).rejects.toThrow(/not allowed/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
