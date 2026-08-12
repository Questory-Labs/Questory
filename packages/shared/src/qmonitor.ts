import { z } from "zod";

export const QMONITOR_CLIENT_ID = "qmonitor";
export const QMONITOR_REDIRECT_URI = "http://127.0.0.1:58473/callback";
export const QMONITOR_SCOPE = "qmonitor";

export const QmonitorSessionWebhookSchema = z.object({
  schema_version: z.literal(1),
  session_id: z.string().min(1),
  source: z.string().min(1),
  steam_app_id: z.number().int().positive().optional(),
  title: z.string().min(1),
  exe: z.string().optional(),
  started_at: z.string().min(1),
  ended_at: z.string().min(1),
  duration_secs: z.number().int().nonnegative(),
  host: z.object({
    os: z.string().min(1),
    hostname: z.string().min(1),
  }),
});
export type QmonitorSessionWebhook = z.infer<typeof QmonitorSessionWebhookSchema>;

export const QmonitorAuthorizeQuerySchema = z.object({
  client_id: z.literal(QMONITOR_CLIENT_ID),
  redirect_uri: z.literal(QMONITOR_REDIRECT_URI),
  state: z.string().min(8).max(128),
  scope: z.string().refine((s) => s.split(/\s+/).includes(QMONITOR_SCOPE), {
    message: "scope must include qmonitor",
  }),
  code_challenge: z.string().min(43).max(128),
  code_challenge_method: z.literal("S256"),
  device_id: z.string().min(16).max(128),
  response_type: z.literal("code").optional().default("code"),
});
export type QmonitorAuthorizeQuery = z.infer<typeof QmonitorAuthorizeQuerySchema>;

export const QmonitorTokenAuthorizationCodeSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  redirect_uri: z.literal(QMONITOR_REDIRECT_URI),
  client_id: z.literal(QMONITOR_CLIENT_ID),
  code_verifier: z.string().min(43).max(128),
  device_id: z.string().min(16).max(128),
});

export const QmonitorTokenRefreshSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1),
  device_id: z.string().min(16).max(128),
  client_id: z.literal(QMONITOR_CLIENT_ID),
});

export const QmonitorTokenRequestSchema = z.discriminatedUnion("grant_type", [
  QmonitorTokenAuthorizationCodeSchema,
  QmonitorTokenRefreshSchema,
]);
export type QmonitorTokenRequest = z.infer<typeof QmonitorTokenRequestSchema>;

export const QmonitorRevokeSchema = z.object({
  token: z.string().min(1),
  token_type_hint: z.enum(["access_token", "refresh_token"]).optional(),
  client_id: z.literal(QMONITOR_CLIENT_ID).optional(),
  device_id: z.string().min(16).max(128).optional(),
});
export type QmonitorRevoke = z.infer<typeof QmonitorRevokeSchema>;

export const QmonitorApproveSchema = z.object({
  pending: z.string().min(1),
  device_label: z.string().max(128).optional(),
});
export type QmonitorApprove = z.infer<typeof QmonitorApproveSchema>;

export const QmonitorHealthFeSchema = z.object({
  ok: z.literal(true),
  service: z.literal("fe"),
});

export const QmonitorHealthBeSchema = z.object({
  ok: z.literal(true),
  service: z.literal("be"),
  webOrigin: z.string().url(),
});

export const QmonitorHealthSchema = z.union([
  QmonitorHealthFeSchema,
  QmonitorHealthBeSchema,
]);
export type QmonitorHealth = z.infer<typeof QmonitorHealthSchema>;

export const PlaySessionGameSchema = z.object({
  id: z.string(),
  name: z.string(),
  headerImage: z.string().nullable(),
  appId: z.number().int().nullable(),
});
export type PlaySessionGame = z.infer<typeof PlaySessionGameSchema>;

export const PlaySessionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  source: z.string(),
  appId: z.number().int().nullable(),
  gameId: z.string().nullable(),
  startedAt: z.string(),
  endedAt: z.string(),
  durationSecs: z.number().int().nonnegative(),
  exe: z.string().nullable(),
  hostOs: z.string().nullable(),
  hostName: z.string().nullable(),
  game: PlaySessionGameSchema.nullable(),
});
export type PlaySessionItem = z.infer<typeof PlaySessionItemSchema>;

export const PlaySessionPageSchema = z.object({
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  items: z.array(PlaySessionItemSchema),
});
export type PlaySessionPage = z.infer<typeof PlaySessionPageSchema>;
