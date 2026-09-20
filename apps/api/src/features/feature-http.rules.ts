import type { FeatureDomain, FeatureSource } from "@questorylabs/shared";
import {
  LIST_PROVIDER_DOMAINS,
  LIST_PROVIDER_SOURCES,
} from "./list-sync-scope";

export type FeatureHttpRequirement = {
  domain: FeatureDomain | readonly FeatureDomain[];
  source?: FeatureSource;
};

function pathname(url: string): string {
  const path = (url.split("?")[0] || "/").replace(/\/+$/, "") || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function anyListDomain(source: FeatureSource): FeatureHttpRequirement {
  return { domain: LIST_PROVIDER_DOMAINS, source };
}

/**
 * Map a request path to the domain/source flags that must be on.
 * Unmatched paths (health, auth, steam, admin, status) are not gated here.
 */
export function matchFeatureRoute(url: string): FeatureHttpRequirement | null {
  const path = pathname(url);

  if (
    path === "/1" ||
    path.startsWith("/1/") ||
    path === "/apis/listenbrainz/1" ||
    path.startsWith("/apis/listenbrainz/1/")
  ) {
    return { domain: "music", source: "listenbrainzIngest" };
  }

  if (path.startsWith("/webhooks/plex") || path.startsWith("/webhooks/jellyfin")) {
    return { domain: "watch", source: "watchWebhooks" };
  }

  if (path.startsWith("/v1/music/scrobbler/lastfm")) {
    return { domain: "music", source: "lastfm" };
  }
  if (path.startsWith("/v1/music/imports")) {
    return { domain: "music", source: "musicImports" };
  }
  if (path.startsWith("/v1/music/trending")) {
    return { domain: "music", source: "listenbrainzApi" };
  }
  if (path.startsWith("/v1/music")) {
    return { domain: "music" };
  }

  // Shared list-provider OAuth and HTTP cron live under /v1/watch/* even when
  // only Read is enabled (redirect_uri and cron paths are Watch-prefixed).
  for (const source of LIST_PROVIDER_SOURCES) {
    if (path === `/v1/watch/${source}/callback`) {
      return anyListDomain(source);
    }
    if (path === `/v1/watch/internal/cron/${source}-sync`) {
      return anyListDomain(source);
    }
  }

  if (path.startsWith("/v1/watch/trakt")) {
    return { domain: "watch", source: "trakt" };
  }
  if (path.startsWith("/v1/watch/anilist")) {
    return { domain: "watch", source: "anilist" };
  }
  if (path.startsWith("/v1/watch/mal")) {
    return { domain: "watch", source: "mal" };
  }
  if (path.startsWith("/v1/watch/kitsu")) {
    return { domain: "watch", source: "kitsu" };
  }
  if (path.startsWith("/v1/watch/shikimori")) {
    return { domain: "watch", source: "shikimori" };
  }
  if (path.startsWith("/v1/watch/bangumi")) {
    return { domain: "watch", source: "bangumi" };
  }
  if (path.startsWith("/v1/watch/letterboxd")) {
    return { domain: "watch", source: "letterboxdScrape" };
  }
  if (path.startsWith("/v1/watch/imports")) {
    return { domain: "watch", source: "letterboxdImport" };
  }
  if (path.startsWith("/v1/watch/trending")) {
    return { domain: "watch", source: "tmdb" };
  }
  if (path.startsWith("/v1/watch")) {
    return { domain: "watch" };
  }

  if (path.startsWith("/v1/read/anilist")) {
    return { domain: "read", source: "anilist" };
  }
  if (path.startsWith("/v1/read/mal")) {
    return { domain: "read", source: "mal" };
  }
  if (path.startsWith("/v1/read/kitsu")) {
    return { domain: "read", source: "kitsu" };
  }
  if (path.startsWith("/v1/read/shikimori")) {
    return { domain: "read", source: "shikimori" };
  }
  if (path.startsWith("/v1/read/bangumi")) {
    return { domain: "read", source: "bangumi" };
  }
  if (path.startsWith("/v1/read/trending")) {
    return { domain: "read", source: "anilist" };
  }
  if (path.startsWith("/v1/read")) {
    return { domain: "read" };
  }

  return null;
}
