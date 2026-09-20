import type { AppStatus, FeatureSource, SourceFlags } from "@questorylabs/shared";
import { FEATURE_SOURCES } from "@questorylabs/shared";
import { apiOnce } from "@/lib/api";
import { parseApiError } from "@/lib/auth-api";

export const APP_STATUS_RESOURCE_ID = ["app-status"] as const;

const DEFAULT_SOURCES = Object.fromEntries(
  FEATURE_SOURCES.map((id) => [id, true]),
) as SourceFlags;

export function defaultSourceFlags(): SourceFlags {
  return { ...DEFAULT_SOURCES };
}

export function fetchAppStatus(): Promise<AppStatus> {
  return apiOnce<AppStatus>("/status");
}

export function sourceEnabled(
  sources: SourceFlags | undefined,
  id: FeatureSource,
): boolean {
  if (!sources) return true;
  return sources[id] !== false;
}

export function featureErrorMessage(err: unknown, fallback: string): string {
  const parsed = parseApiError(err);
  if (
    parsed.status === 403 &&
    /disabled on this instance/i.test(parsed.message)
  ) {
    return parsed.message;
  }
  return fallback;
}
