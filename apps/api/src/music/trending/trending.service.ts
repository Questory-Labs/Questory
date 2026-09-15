import { Injectable, Logger } from "@nestjs/common";
import type { MediaTrendingShelf } from "@questorylabs/shared";
import { CacheService } from "../../cache/cache.service";
import { providerFetch } from "../../lib/qhttp-outbound";
import {
  cachedMediaShelf,
  emptyMediaShelf,
  MEDIA_TRENDING_TOP_N,
  rankItems,
} from "../../lib/media-trending-shelf";

const LB_SITEWIDE = (() => {
  const url = new URL("https://api.listenbrainz.org/1/stats/sitewide/artists");
  url.searchParams.set("range", "week");
  url.searchParams.set("count", String(MEDIA_TRENDING_TOP_N));
  return url.toString();
})();
const CACHE_KEY = "trending:music:sitewide:v1";

type LbArtist = {
  artist_mbid?: string | null;
  artist_name?: string;
  listen_count?: number;
};

function listenbrainzUserAgent() {
  return (
    process.env.MUSICBRAINZ_USER_AGENT ||
    "QuestoryLabs-Music/0.1 (https://github.com/Questory-Labs/Questory)"
  );
}

function isoDate(unixSec: number): string {
  return new Date(unixSec * 1000).toISOString().slice(0, 10);
}

@Injectable()
export class MusicTrendingService {
  private readonly logger = new Logger(MusicTrendingService.name);

  constructor(private readonly cache: CacheService) {}

  async sitewide(): Promise<MediaTrendingShelf> {
    const empty = emptyMediaShelf({
      source: "listenbrainz",
      windowLabel: "ListenBrainz completed week (Mon–Sun)",
      from: null,
      to: null,
    });
    return cachedMediaShelf(this.cache, CACHE_KEY, empty, () =>
      this.fetchSitewide(),
    );
  }

  private async fetchSitewide(): Promise<MediaTrendingShelf | null> {
    try {
      const res = await providerFetch(
        LB_SITEWIDE,
        {
          headers: {
            Accept: "application/json",
            "User-Agent": listenbrainzUserAgent(),
          },
        },
        { retries: 1 },
      );
      if (!res.ok) {
        this.logger.warn(`ListenBrainz sitewide → ${res.status}`);
        return null;
      }
      const json = (await res.json()) as {
        payload?: {
          from_ts?: number;
          to_ts?: number;
          artists?: LbArtist[];
        };
      };
      const payload = json.payload;
      const from =
        typeof payload?.from_ts === "number" ? isoDate(payload.from_ts) : null;
      const to =
        typeof payload?.to_ts === "number" ? isoDate(payload.to_ts) : null;
      const windowLabel =
        from && to
          ? `ListenBrainz week ${from} – ${to}`
          : "ListenBrainz completed week (Mon–Sun)";
      const artists = (payload?.artists ?? [])
        .filter((a): a is LbArtist & { artist_name: string } =>
          Boolean(a.artist_name),
        )
        .slice(0, MEDIA_TRENDING_TOP_N);
      return {
        items: rankItems(
          artists.map((a) => {
            const mbid = a.artist_mbid?.trim();
            return {
              id: mbid || a.artist_name,
              name: a.artist_name,
              imageUrl: null,
              subtitle: null,
              href: mbid
                ? `https://listenbrainz.org/artist/${mbid}`
                : null,
              listenCount: a.listen_count,
            };
          }),
        ),
        meta: { source: "listenbrainz", windowLabel, from, to },
      };
    } catch (err) {
      this.logger.warn(
        `ListenBrainz sitewide failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
