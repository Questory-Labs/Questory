import { z } from "zod";

export const SubmitListensSchema = z.object({
  listen_type: z.string().nullish(),
  payload: z.unknown(),
});

export const ListenItemSchema = z.looseObject({
  listened_at: z.union([z.number(), z.string()]).nullish(),
  track_metadata: z.looseObject({
    artist_name: z.string().trim().min(1),
    track_name: z.string().trim().min(1),
    release_name: z.string().nullish(),
    additional_info: z.looseObject({}).nullish(),
  }),
});
