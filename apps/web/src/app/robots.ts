import type { MetadataRoute } from "next";

const DISALLOW_PREFIXES = [
  "/admin",
  "/dashboard",
  "/library",
  "/wishlist",
  "/collections",
  "/cost",
  "/family",
  "/friends",
  "/multiplayer",
  "/trending",
  "/search",
  "/settings",
  "/music",
  "/watch",
  "/read",
  "/recommendations",
  "/test",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/login", "/register"],
      disallow: DISALLOW_PREFIXES,
    },
    sitemap: "https://questorylabs.com/sitemap.xml",
  };
}
