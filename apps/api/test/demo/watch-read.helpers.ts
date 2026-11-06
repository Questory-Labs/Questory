import type { DemoRequestContext, DemoRoute } from "../../src/demo/demo.types";
import { readRoutes } from "../../src/demo/fixtures/read";
import { watchRoutes } from "../../src/demo/fixtures/watch";

export const allRoutes = [...watchRoutes, ...readRoutes];

export function call(
  routes: DemoRoute[],
  pattern: string,
  query: Record<string, unknown> = {},
  params: Record<string, string> = {},
): any {
  const route = routes.find((r) => r.pattern === pattern);
  if (!route) throw new Error(`missing route ${pattern}`);
  const ctx: DemoRequestContext = {
    exp: Date.now() + 3_600_000,
    params,
    query,
    body: undefined,
  };
  return JSON.parse(JSON.stringify(route.respond(ctx)));
}

export const watch = (
  pattern: string,
  query: Record<string, unknown> = {},
  params: Record<string, string> = {},
) => call(watchRoutes, `/watch${pattern}`, query, params);

export const read = (
  pattern: string,
  query: Record<string, unknown> = {},
  params: Record<string, string> = {},
) => call(readRoutes, `/read${pattern}`, query, params);

export function lastMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i - 1, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}
