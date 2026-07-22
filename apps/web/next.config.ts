import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { NextConfig } from "next";

/**
 * Private enterprise UI mount: when the (gitignored) enterprise web-ui
 * sources are present, alias @enterprise/web to them; otherwise fall back to
 * the bundled no-op stub. Community builds and Docker images never include
 * the enterprise tree, so they always get the stub.
 */
const ENTERPRISE_WEB_ENTRY = resolve(
  __dirname,
  "../../enterprise/packages/web-ui/src/index.tsx",
);
const ENTERPRISE_STUB = resolve(__dirname, "src/lib/enterprise-stub.tsx");
const enterpriseWebTarget = existsSync(ENTERPRISE_WEB_ENTRY)
  ? ENTERPRISE_WEB_ENTRY
  : ENTERPRISE_STUB;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.cloudflare.steamstatic.com" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "media.steampowered.com" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
    ],
  },
  turbopack: {
    resolveAlias: {
      "@enterprise/web": enterpriseWebTarget,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@enterprise/web": enterpriseWebTarget,
    };
    return config;
  },
};

export default nextConfig;
