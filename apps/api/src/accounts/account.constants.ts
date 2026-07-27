export const ACCOUNT_PROVIDER = {
  steam: "steam",
  listenbrainz: "listenbrainz",
} as const;

export type AccountProvider =
  (typeof ACCOUNT_PROVIDER)[keyof typeof ACCOUNT_PROVIDER];

export const API_KEY_TYPE = {
  musicIngest: "music_ingest",
  watchWebhook: "watch_webhook",
} as const;

export type ApiKeyType = (typeof API_KEY_TYPE)[keyof typeof API_KEY_TYPE];

export const API_KEY_TYPES = Object.values(API_KEY_TYPE);
