/** 7 days. */
export const PROFILE_EXPORT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PROFILE_EXPORT_BATCH_SIZE = 200;

export const PROFILE_EXPORT_YIELD_EVERY = 25;

export const PROFILE_EXPORT_QUEUE = "profile-export";

export const PROFILE_IMPORT_SOURCE = "questory_profile";

export const PROFILE_IMPORT_MAX_BYTES = 120 * 1024 * 1024;

export const PROFILE_EXPORT_IN_FLIGHT = ["pending", "running"] as const;
