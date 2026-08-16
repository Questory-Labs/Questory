import { z } from "zod";

export const EntitlementFeatureSchema = z.enum(["recommendations", "rewindAi"]);
export type EntitlementFeature = z.infer<typeof EntitlementFeatureSchema>;

export const ENTITLEMENT_FEATURES = EntitlementFeatureSchema.options;

export const UserEntitlementsSchema = z.object({
  recommendations: z.boolean(),
  rewindAi: z.boolean(),
});
export type UserEntitlements = z.infer<typeof UserEntitlementsSchema>;
