import { normalizeDemoPath } from "@questorylabs/shared";
import type { DemoRoute } from "./demo.types";
import { adminEnterpriseRoutes } from "./fixtures/admin-enterprise";
import { enterpriseRoutes } from "./fixtures/enterprise";
import { gamesRoutes } from "./fixtures/games";
import { musicRoutes } from "./fixtures/music";
import { readRoutes } from "./fixtures/read";
import { shellRoutes } from "./fixtures/shell";
import { socialRoutes } from "./fixtures/social";
import { watchRoutes } from "./fixtures/watch";

export const DEMO_ROUTES: readonly DemoRoute[] = [
  ...shellRoutes,
  ...gamesRoutes,
  ...socialRoutes,
  ...musicRoutes,
  ...watchRoutes,
  ...readRoutes,
  ...enterpriseRoutes,
  ...adminEnterpriseRoutes,
];

export const DEMO_PASS_THROUGH_PATHS = new Set(["/health", "/api/health"]);

export function isDemoStreamPath(path: string): boolean {
  return path.endsWith("/stream");
}

function matchPattern(
  pattern: string,
  path: string,
): Record<string, string> | null {
  const expected = pattern.split("/");
  const actual = path.split("/");
  if (expected.length !== actual.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < expected.length; i += 1) {
    const segment = expected[i];
    if (segment.startsWith(":")) {
      if (!actual[i]) return null;
      try {
        params[segment.slice(1)] = decodeURIComponent(actual[i]);
      } catch {
        return null;
      }
    } else if (segment !== actual[i]) {
      return null;
    }
  }
  return params;
}

export function findDemoRoute(
  method: string,
  rawPath: string,
  routes: readonly DemoRoute[] = DEMO_ROUTES,
): { route: DemoRoute; params: Record<string, string> } | null {
  const verb = method.toUpperCase() === "HEAD" ? "GET" : method.toUpperCase();
  const path = normalizeDemoPath(rawPath);
  let fallback: { route: DemoRoute; params: Record<string, string> } | null =
    null;
  for (const route of routes) {
    if (route.method !== verb) continue;
    const params = matchPattern(route.pattern, path);
    if (!params) continue;
    if (!route.pattern.includes(":")) return { route, params };
    fallback ??= { route, params };
  }
  return fallback;
}
