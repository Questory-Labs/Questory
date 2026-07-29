/** Use submission client when the upstream payload omits music_service. */
export function resolveMusicService(
  musicService: string | null | undefined,
  submissionClient: string | null | undefined,
): string | null {
  const svc = (musicService ?? "").trim();
  if (svc) return svc;
  const client = (submissionClient ?? "").trim();
  return client || null;
}

export function resolveMusicServiceLabel(
  musicService: string | null | undefined,
  submissionClient: string | null | undefined,
): string {
  const resolved = resolveMusicService(musicService, submissionClient);
  return (resolved || "unknown").trim() || "unknown";
}

/** Recover service metadata from stored ListenBrainz / multi-scrobbler payloads. */
export function musicServiceFromRawPayload(
  rawPayload: string | null | undefined,
): string | null {
  if (!rawPayload) return null;
  try {
    const item = JSON.parse(rawPayload) as {
      track_metadata?: {
        additional_info?: {
          music_service?: string;
          submission_client?: string;
        };
      };
    };
    const info = item.track_metadata?.additional_info;
    if (!info) return null;
    return resolveMusicService(info.music_service, info.submission_client);
  } catch {
    return null;
  }
}
