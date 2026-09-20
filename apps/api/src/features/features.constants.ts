export const FEATURE_FLAGS_TTL_MS = 30_000;

export const featureConfigKey = (domain: string) => `feature.${domain}`;
export const sourceConfigKey = (source: string) => `source.${source}`;
