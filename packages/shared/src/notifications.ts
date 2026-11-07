import { z } from "zod";

export const NOTIFICATION_CHANNEL_KINDS = ["discord", "ntfy", "email"] as const;
export const NotificationChannelKindSchema = z.enum(NOTIFICATION_CHANNEL_KINDS);
export type NotificationChannelKind = z.infer<typeof NotificationChannelKindSchema>;

export const NOTIFICATION_TYPES = [
  "deal",
  "monthly-recap",
  "sync-failed",
  "goal-completed",
  "friend-new-game",
] as const;
export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPES);
export type NotificationType = z.infer<typeof NotificationTypeSchema>;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  deal: "Wishlist deals",
  "monthly-recap": "Monthly recap ready",
  "sync-failed": "Sync failures",
  "goal-completed": "Goal completed",
  "friend-new-game": "Friend bought a game",
};

export const NotificationChannelTypesSchema = z
  .array(z.union([NotificationTypeSchema, z.literal("*")]))
  .min(1)
  .max(NOTIFICATION_TYPES.length + 1);

const httpsUrl = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((u) => u.startsWith("https://"), "Must be an https URL");

export const DiscordChannelConfigSchema = z.object({
  webhookUrl: httpsUrl.refine((u) => {
    try {
      const host = new URL(u).hostname;
      return host === "discord.com" || host === "discordapp.com";
    } catch {
      return false;
    }
  }, "Must be a discord.com webhook URL"),
});

export type DiscordChannelConfig = z.infer<typeof DiscordChannelConfigSchema>;

export const NtfyChannelConfigSchema = z.object({
  server: httpsUrl.optional().default("https://ntfy.sh"),
  topic: z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9_-]+$/, "Invalid topic"),
  token: z.string().trim().max(256).optional(),
});

export type NtfyChannelConfig = z.infer<typeof NtfyChannelConfigSchema>;

export const EmailChannelConfigSchema = z.object({
  address: z.string().trim().email().max(254),
});

export type EmailChannelConfig = z.infer<typeof EmailChannelConfigSchema>;

export const NotificationChannelConfigSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("discord"), config: DiscordChannelConfigSchema }),
  z.object({ kind: z.literal("ntfy"), config: NtfyChannelConfigSchema }),
  z.object({ kind: z.literal("email"), config: EmailChannelConfigSchema }),
]);
export type NotificationChannelConfig = z.infer<typeof NotificationChannelConfigSchema>;

export const NotificationChannelCreateSchema = z
  .object({
    label: z.string().trim().min(1).max(80).nullable().optional(),
    types: NotificationChannelTypesSchema.optional().default(["*"]),
  })
  .and(NotificationChannelConfigSchema);
export type NotificationChannelCreate = z.infer<typeof NotificationChannelCreateSchema>;

export const NotificationChannelUpdateSchema = z.object({
  label: z.string().trim().min(1).max(80).nullable().optional(),
  types: NotificationChannelTypesSchema.optional(),
  enabled: z.boolean().optional(),
});
export type NotificationChannelUpdate = z.infer<typeof NotificationChannelUpdateSchema>;

export const NotificationChannelSchema = z.object({
  id: z.string(),
  kind: NotificationChannelKindSchema,
  label: z.string().nullable(),
  /** Redacted human-readable target, never the raw secret. */
  target: z.string(),
  types: NotificationChannelTypesSchema,
  enabled: z.boolean(),
  lastSentAt: z.string().nullable(),
  lastError: z.string().nullable(),
  verified: z.boolean(),
  createdAt: z.string(),
});
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationChannelVerifySchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,64}$/),
});
export type NotificationChannelVerify = z.infer<typeof NotificationChannelVerifySchema>;

export const NotificationChannelListResponseSchema = z.object({
  items: z.array(NotificationChannelSchema),
  /** Which kinds this instance can deliver (email requires SMTP_URL). */
  availableKinds: z.array(NotificationChannelKindSchema),
});
export type NotificationChannelListResponse = z.infer<
  typeof NotificationChannelListResponseSchema
>;
