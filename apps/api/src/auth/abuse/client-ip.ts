import { Request } from "express";
import { isIP } from "node:net";

function envEnabled(name: string): boolean {
  const raw = (process.env[name] || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

function cloudflareClientIp(req: Request): string | null {
  const header = req.headers["cf-connecting-ip"];
  if (typeof header !== "string") return null;
  const ip = header.trim();
  return isIP(ip) ? ip : null;
}

export function clientIpFromRequest(req: Request): string {
  if (envEnabled("TRUST_CLOUDFLARE")) {
    const ip = cloudflareClientIp(req);
    if (ip) return ip;
  }
  if (envEnabled("TRUST_PROXY")) {
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
