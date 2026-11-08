import { z } from "zod";

export const PUBLIC_API_SCOPES = [
  "profile:read",
  "library:read",
  "wishlist:read",
  "sessions:read",
  "rewind:read",
  "music:read",
  "watch:read",
  "read:read",
] as const;
export const PublicApiScopeSchema = z.enum(PUBLIC_API_SCOPES);
export type PublicApiScope = z.infer<typeof PublicApiScopeSchema>;

export const PUBLIC_API_SCOPE_LABELS: Record<PublicApiScope, string> = {
  "profile:read": "Profile (name, avatar, country)",
  "library:read": "Game library and backlog",
  "wishlist:read": "Wishlist and deals",
  "sessions:read": "Play sessions and now playing",
  "rewind:read": "Rewind stats",
  "music:read": "Music listens",
  "watch:read": "Watch history",
  "read:read": "Reading history",
};

export const PublicApiKeyCreateSchema = z.object({
  label: z.string().trim().min(1).max(80),
  scopes: z.array(PublicApiScopeSchema).min(1).max(PUBLIC_API_SCOPES.length),
});
export type PublicApiKeyCreate = z.infer<typeof PublicApiKeyCreateSchema>;

export const PublicApiKeySchema = z.object({
  id: z.string(),
  label: z.string().nullable(),
  tokenPrefix: z.string(),
  scopes: z.array(PublicApiScopeSchema),
  createdAt: z.string(),
  lastUsedAt: z.string().nullable(),
});
export type PublicApiKey = z.infer<typeof PublicApiKeySchema>;

export const PublicApiKeyCreatedSchema = PublicApiKeySchema.extend({
  /** Plaintext — shown once. */
  token: z.string(),
});
export type PublicApiKeyCreated = z.infer<typeof PublicApiKeyCreatedSchema>;

export const PUBLIC_API_RATE_LIMIT = { max: 60, ttl: 60 } as const;
