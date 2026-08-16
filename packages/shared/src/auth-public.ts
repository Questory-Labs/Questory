import { z } from "zod";
import { UserEntitlementsSchema } from "./entitlements";

export const AuthEmailSchema = z.object({
  email: z.string().trim().email().max(254),
});
export type AuthEmailInput = z.infer<typeof AuthEmailSchema>;

export const AuthSetPasswordSchema = z.object({
  password: z.string().min(10).max(128),
  currentPassword: z.string().min(10).max(128).optional(),
});
export type AuthSetPasswordInput = z.infer<typeof AuthSetPasswordSchema>;

export const AuthResetPasswordSchema = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(10).max(128),
});
export type AuthResetPasswordInput = z.infer<typeof AuthResetPasswordSchema>;

export const AuthMeUserSchema = z.object({
  id: z.string(),
  steamId: z.string().nullable(),
  email: z.string().nullable().optional(),
  isAdmin: z.boolean().optional(),
  hasPassword: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
  personaName: z.string(),
  avatarUrl: z.string().nullable(),
  profileUrl: z.string().nullable(),
  countryCode: z.string().nullable().optional(),
  priceRegionLocked: z.boolean().optional(),
  currency: z.string().optional(),
});
export type AuthMeUser = z.infer<typeof AuthMeUserSchema>;

export const AuthMeResponseSchema = z.object({
  user: AuthMeUserSchema.nullable(),
  mailActive: z.boolean().optional(),
  requireEmailVerification: z.boolean().optional(),
  entitlements: UserEntitlementsSchema.optional(),
});
export type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;
