import { Request } from "express";

function trustProxyEnabled(): boolean {
  const raw = (process.env.TRUST_PROXY || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function clientIpFromRequest(req: Request): string {
  if (trustProxyEnabled()) {
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim()) {
      return xff.split(",")[0]!.trim();
    }
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) {
      return realIp.trim();
    }
  }
  return req.socket?.remoteAddress || req.ip || "unknown";
}
