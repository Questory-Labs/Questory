import { PUBLIC_API_RATE_LIMIT, PUBLIC_API_SCOPES } from "@questorylabs/shared";

const bearer = [{ apiKey: [] }];

const paged = {
  page: { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
  pageSize: {
    name: "pageSize",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: 100 },
  },
};

const responses = (description: string, scope?: string) => ({
  200: { description },
  401: { description: "Missing, invalid, or revoked API key" },
  ...(scope ? { 403: { description: `Key lacks the ${scope} scope` } } : {}),
  429: {
    description: `Rate limit exceeded (${PUBLIC_API_RATE_LIMIT.max} requests per ${PUBLIC_API_RATE_LIMIT.ttl}s per key); see Retry-After`,
  },
});

const op = (
  summary: string,
  scope: string | null,
  parameters: object[] = [],
  tag = "Core",
) => ({
  get: {
    summary,
    tags: [tag],
    security: bearer,
    ...(scope ? { "x-required-scope": scope } : {}),
    parameters,
    responses: responses("OK", scope ?? undefined),
  },
});

export const publicApiOpenApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Questory Public API",
    version: "1",
    description:
      "Read-only access to a Questory account using a user-created API key. Send the key as `Authorization: Bearer <token>`. Each key carries scopes; every endpoint lists the scope it requires. Cost fields (prices paid, value, cost per hour, purchase dates) are never exposed.",
  },
  servers: [{ url: "/public/v1" }],
  components: {
    securitySchemes: {
      apiKey: {
        type: "http",
        scheme: "bearer",
        description: `Public API key. Scopes: ${PUBLIC_API_SCOPES.join(", ")}`,
      },
    },
  },
  paths: {
    "/openapi.json": {
      get: {
        summary: "This document",
        tags: ["Meta"],
        security: [],
        parameters: [],
        responses: { 200: { description: "OpenAPI 3.0 document" } },
      },
    },
    "/me": op("Account profile", "profile:read"),
    "/library": op(
      "Game library (paged, filterable)",
      "library:read",
      [
        { name: "q", in: "query", schema: { type: "string" } },
        { name: "genre", in: "query", schema: { type: "string" } },
        { name: "tag", in: "query", schema: { type: "string" } },
        { name: "store", in: "query", schema: { type: "string" } },
        { name: "minPlaytime", in: "query", schema: { type: "integer" } },
        { name: "maxPlaytime", in: "query", schema: { type: "integer" } },
        { name: "unplayed", in: "query", schema: { type: "boolean" } },
        { name: "multiplayer", in: "query", schema: { type: "boolean" } },
        { name: "singleplayer", in: "query", schema: { type: "boolean" } },
        { name: "coop", in: "query", schema: { type: "boolean" } },
        { name: "pvp", in: "query", schema: { type: "boolean" } },
        { name: "deck", in: "query", schema: { type: "boolean" } },
        { name: "controller", in: "query", schema: { type: "boolean" } },
        { name: "publisher", in: "query", schema: { type: "string" } },
        { name: "developer", in: "query", schema: { type: "string" } },
        { name: "sort", in: "query", schema: { type: "string" } },
        { name: "status", in: "query", schema: { type: "string" } },
        paged.page,
        paged.pageSize,
      ],
      "Games",
    ),
    "/library/backlog": op(
      "Backlog summary: counts, HowLongToBeat hours, pace",
      "library:read",
      [{ name: "tz", in: "query", schema: { type: "string" } }],
      "Games",
    ),
    "/library/{id}": op(
      "One library entry by game id or Steam appId",
      "library:read",
      [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      "Games",
    ),
    "/now-playing": op(
      "Most recent game activity, plus music now-playing when the key has music:read",
      "sessions:read",
      [],
      "Activity",
    ),
    "/recent": op(
      "Unified recent activity across sessions, listens, watch and read events; each part requires its own scope",
      null,
      [
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", minimum: 1, maximum: 50, default: 20 },
        },
      ],
      "Activity",
    ),
    "/wishlist": op(
      "Wishlist (paged)",
      "wishlist:read",
      [{ name: "store", in: "query", schema: { type: "string" } }, paged.page, paged.pageSize],
      "Games",
    ),
    "/wishlist/deals": op("Wishlist items currently on sale", "wishlist:read", [], "Games"),
    "/rewind/{domain}/{period}": op(
      "Rewind stats for a domain and period (YYYY or YYYY-MM)",
      "rewind:read",
      [
        {
          name: "domain",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["games", "music", "watch", "read", "all"] },
        },
        {
          name: "period",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^\\d{4}(-\\d{2})?$" },
        },
        { name: "tz", in: "query", schema: { type: "string" } },
      ],
      "Rewind",
    ),
    "/music/listens": op(
      "Recent music listens (paged; requires the music module)",
      "music:read",
      [paged.page, paged.pageSize],
      "Music",
    ),
    "/watch/history": op(
      "Recent watch events (paged; requires the watch module)",
      "watch:read",
      [paged.page, paged.pageSize],
      "Watch",
    ),
    "/read/history": op(
      "Recent reading events (paged; requires the read module)",
      "read:read",
      [paged.page, paged.pageSize],
      "Read",
    ),
  },
} as const;
