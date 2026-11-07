import { describe, expect, it } from "vitest";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { PUBLIC_API_SCOPES } from "@questorylabs/shared";
import { PublicApiController } from "../../src/public-api/public-api.controller";
import { PublicApiDocsController } from "../../src/public-api/public-api-docs.controller";
import { publicApiOpenApiDocument } from "../../src/public-api/openapi";
import { PUBLIC_API_SCOPES_KEY } from "../../src/auth/scopes.decorator";

type Route = { method: string; path: string; scopes: string[] };

function routesOf(ctrl: new (...args: never[]) => unknown): Route[] {
  const routes: Route[] = [];
  const proto = ctrl.prototype as Record<string, unknown>;
  for (const name of Object.getOwnPropertyNames(proto)) {
    if (name === "constructor") continue;
    const handler = proto[name] as object;
    const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
    const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
    if (path == null || method == null) continue;
    const scopes = (Reflect.getMetadata(PUBLIC_API_SCOPES_KEY, handler) as string[] | undefined) ?? [];
    routes.push({
      method: RequestMethod[method].toLowerCase(),
      path: `/${path.replace(/^\//, "")}`.replace(/:([A-Za-z0-9_]+)/g, "{$1}"),
      scopes,
    });
  }
  return routes;
}

describe("public API OpenAPI document", () => {
  const routes = [...routesOf(PublicApiDocsController), ...routesOf(PublicApiController)];
  const paths = publicApiOpenApiDocument.paths as Record<string, Record<string, { "x-required-scope"?: string }>>;

  it("documents every public route", () => {
    expect(routes.length).toBeGreaterThan(5);
    for (const route of routes) {
      expect(paths[route.path], route.path).toBeDefined();
      expect(paths[route.path][route.method], `${route.method} ${route.path}`).toBeDefined();
    }
  });

  it("documents no route that does not exist", () => {
    const actual = new Set(routes.map((r) => `${r.method} ${r.path}`));
    for (const [path, ops] of Object.entries(paths)) {
      for (const method of Object.keys(ops)) {
        expect(actual.has(`${method} ${path}`), `${method} ${path}`).toBe(true);
      }
    }
  });

  it("declares the required scope that the controller enforces", () => {
    for (const route of routes) {
      const declared = paths[route.path][route.method]["x-required-scope"];
      expect(declared ?? null, `${route.method} ${route.path}`).toBe(route.scopes[0] ?? null);
      if (declared) expect(PUBLIC_API_SCOPES).toContain(declared);
    }
  });
});
