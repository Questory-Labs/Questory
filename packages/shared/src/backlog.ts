import { z } from "zod";

export const BacklogNextUpSchema = z.object({
  gameId: z.string(),
  appId: z.number().int().nullable(),
  name: z.string(),
  headerImage: z.string().nullable(),
  hltbMainHours: z.number().nullable(),
  reviewScore: z.number().nullable(),
  playtimeHours: z.number(),
});
export type BacklogNextUp = z.infer<typeof BacklogNextUpSchema>;

export const BacklogSummarySchema = z.object({
  counts: z.object({
    playing: z.number().int(),
    backlog: z.number().int(),
    shelved: z.number().int(),
    finished: z.number().int(),
    dropped: z.number().int(),
    unset: z.number().int(),
  }),
  backlogHours: z.object({
    main: z.number(),
    extra: z.number(),
    /** Games in the backlog with no HowLongToBeat estimate. */
    unknownCount: z.number().int(),
  }),
  /** Main-story hours left across backlog + playing, net of time already played. */
  remainingHours: z.number(),
  avgWeeklyHours: z.number(),
  avgSource: z.enum(["snapshots", "steam2weeks", "none"]),
  weeksToClear: z.number().nullable(),
  nextUp: z.array(BacklogNextUpSchema),
});
export type BacklogSummary = z.infer<typeof BacklogSummarySchema>;
