import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clientIpFromRequest } from "../../src/auth/abuse/client-ip";

const SOCKET_IP = "172.18.0.5";
const REAL_IP = "203.0.113.7";

function makeReq(headers: Record<string, string | string[]> = {}) {
  return { headers, socket: { remoteAddress: SOCKET_IP } } as never;
}

describe("clientIpFromRequest", () => {
  const saved = {
    cloudflare: process.env.TRUST_CLOUDFLARE,
    proxy: process.env.TRUST_PROXY,
  };

  beforeEach(() => {
    delete process.env.TRUST_CLOUDFLARE;
    delete process.env.TRUST_PROXY;
  });

  afterEach(() => {
    delete process.env.TRUST_CLOUDFLARE;
    delete process.env.TRUST_PROXY;
    if (saved.cloudflare !== undefined) process.env.TRUST_CLOUDFLARE = saved.cloudflare;
    if (saved.proxy !== undefined) process.env.TRUST_PROXY = saved.proxy;
  });

  it("ignores every client header by default", () => {
    const req = makeReq({
      "cf-connecting-ip": REAL_IP,
      "x-forwarded-for": REAL_IP,
      "x-real-ip": REAL_IP,
    });
    expect(clientIpFromRequest(req)).toBe(SOCKET_IP);
  });

  it("does not read cf-connecting-ip under TRUST_PROXY alone", () => {
    process.env.TRUST_PROXY = "true";
    expect(clientIpFromRequest(makeReq({ "cf-connecting-ip": REAL_IP }))).toBe(SOCKET_IP);
  });

  it("uses cf-connecting-ip over a spoofed x-forwarded-for", () => {
    process.env.TRUST_CLOUDFLARE = "true";
    process.env.TRUST_PROXY = "true";
    const req = makeReq({
      "cf-connecting-ip": REAL_IP,
      "x-forwarded-for": "198.51.100.1, 203.0.113.7",
    });
    expect(clientIpFromRequest(req)).toBe(REAL_IP);
  });

  it("accepts IPv6", () => {
    process.env.TRUST_CLOUDFLARE = "true";
    expect(clientIpFromRequest(makeReq({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it.each([
    ["garbage", "not-an-ip"],
    ["a list", "203.0.113.7, 198.51.100.1"],
    ["empty", ""],
    ["a repeated header", ["203.0.113.7", "198.51.100.1"]],
  ])("falls back to the socket for %s", (_label, value) => {
    process.env.TRUST_CLOUDFLARE = "true";
    expect(clientIpFromRequest(makeReq({ "cf-connecting-ip": value }))).toBe(SOCKET_IP);
  });

  it("falls back to the socket when the header is missing", () => {
    process.env.TRUST_CLOUDFLARE = "true";
    expect(clientIpFromRequest(makeReq())).toBe(SOCKET_IP);
  });

  it("keeps the TRUST_PROXY behaviour", () => {
    process.env.TRUST_PROXY = "yes";
    expect(clientIpFromRequest(makeReq({ "x-forwarded-for": `${REAL_IP}, 10.0.0.1` }))).toBe(REAL_IP);
    expect(clientIpFromRequest(makeReq({ "x-real-ip": REAL_IP }))).toBe(REAL_IP);
  });
});
