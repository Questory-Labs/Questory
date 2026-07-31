import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

/** Load repo-root .env so ENTERPRISE (and peers) work when Next cwd is apps/web. */
function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile(resolve(__dirname, "../../.env"));
loadEnvFile(resolve(__dirname, ".env.local"));
loadEnvFile(resolve(__dirname, ".env"));

const nextConfig: NextConfig = {
  // Playwright e2e and local API calls use 127.0.0.1; Next 16 blocks cross-origin dev access by default.
  allowedDevOrigins: ["127.0.0.1"],
  // Expose enterprise opt-in + Rust service URL to the browser.
  env: {
    ENTERPRISE: process.env.ENTERPRISE ?? "",
    NEXT_PUBLIC_ENTERPRISE_URL:
      process.env.NEXT_PUBLIC_ENTERPRISE_URL ?? "http://localhost:4030",
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "media.steampowered.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
    ],
  },
};

export default nextConfig;
