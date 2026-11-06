import { DEMO_EMAIL, DEMO_USER_ID } from "@questorylabs/shared";

export const DEMO_STEAM_ID = "10000000000000000";

export function demoUser(exp: number) {
  return {
    id: DEMO_USER_ID,
    steamId: DEMO_STEAM_ID,
    email: DEMO_EMAIL,
    isAdmin: false,
    hasPassword: false,
    personaName: "Demo Player",
    avatarUrl: null,
    profileUrl: null,
    countryCode: "US",
    currency: "USD",
    priceRegionLocked: false,
    createdAt: "2025-01-15T12:00:00.000Z",
    isDemo: true,
    sessionExpiresAt: new Date(exp).toISOString(),
  };
}
