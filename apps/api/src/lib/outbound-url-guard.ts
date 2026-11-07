import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net, prefix, "ipv4");
}
for (const [net, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net, prefix, "ipv6");
}

export class OutboundTargetError extends Error {}

function allowPrivateHosts(): boolean {
  return /^(1|true|yes)$/i.test(process.env.NOTIFICATIONS_ALLOW_PRIVATE_HOSTS?.trim() ?? "");
}

export function isBlockedAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return blocked.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 4) return blocked.check(address, "ipv4");
  if (family === 6) return blocked.check(address, "ipv6");
  return true;
}

function abortable<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new Error("aborted"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error("aborted"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (v) => {
        signal.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        signal.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

export async function assertPublicHttpsTarget(raw: string, signal?: AbortSignal): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new OutboundTargetError("Destination URL is invalid");
  }
  if (url.protocol !== "https:") throw new OutboundTargetError("Destination must use https");
  if (url.username || url.password) {
    throw new OutboundTargetError("Destination must not embed credentials");
  }
  if (allowPrivateHosts()) return url;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: string[];
  if (isIP(host)) {
    addresses = [host];
  } else {
    try {
      const records = await abortable(lookup(host, { all: true, verbatim: true }), signal);
      addresses = records.map((r) => r.address);
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new OutboundTargetError("Destination host could not be resolved");
    }
  }
  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new OutboundTargetError("Destination host is not allowed");
  }
  return url;
}

export async function postToPublicUrl(
  raw: string,
  init: { headers: Record<string, string>; body: string; signal: AbortSignal },
): Promise<Response> {
  const url = await assertPublicHttpsTarget(raw, init.signal);
  const res = await fetch(url, {
    method: "POST",
    headers: init.headers,
    body: init.body,
    signal: init.signal,
    redirect: "manual",
  });
  if (res.status >= 300 && res.status < 400) {
    throw new OutboundTargetError("Destination redirects are not allowed");
  }
  return res;
}
