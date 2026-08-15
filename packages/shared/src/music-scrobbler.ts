import { z } from "zod";

export const MusicScrobblerProviderSchema = z.enum(["lastfm", "spotify"]);
export type MusicScrobblerProvider = z.infer<
  typeof MusicScrobblerProviderSchema
>;

export const MusicScrobblerSourceStatusSchema = z.object({
  configured: z.boolean(),
  connected: z.boolean(),
  username: z.string().nullable(),
  lastSyncedAt: z.string().nullable(),
  lastError: z.string().nullable(),
});
export type MusicScrobblerSourceStatus = z.infer<
  typeof MusicScrobblerSourceStatusSchema
>;

export const MusicScrobblerStatusSchema = z.object({
  nativeScrobbling: z.boolean(),
  lastfm: MusicScrobblerSourceStatusSchema,
});
export type MusicScrobblerStatus = z.infer<typeof MusicScrobblerStatusSchema>;
