import type { MetadataRoute } from "next";

const PUBLIC_PATHS = ["/", "/login", "/register"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.map((path) => ({
    url: `https://questorylabs.com${path === "/" ? "" : path}`,
    lastModified,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
