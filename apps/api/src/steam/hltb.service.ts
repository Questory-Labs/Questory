import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../cache/cache.service";

export type HltbTimes = {
  mainHours: number | null;
  extraHours: number | null;
  completionistHours: number | null;
  sourceUrl: string | null;
};

@Injectable()
export class HltbService {
  private readonly logger = new Logger(HltbService.name);

  constructor(private readonly cache: CacheService) {}

  async lookup(gameName: string): Promise<HltbTimes | null> {
    const title = gameName.trim();
    if (!title) return null;

    const cacheKey = `hltb:v1:${title.toLowerCase()}`;
    const cached = await this.cache.getJson<HltbTimes | { miss: true }>(cacheKey);
    if (cached) {
      if ("miss" in cached) return null;
      return cached;
    }

    try {
      const terms = title
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 8);

      const res = await fetch("https://howlongtobeat.com/api/find", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "*/*",
          "User-Agent": "QuestoryLabs/1.0",
          Referer: "https://howlongtobeat.com/",
        },
        body: JSON.stringify({
          searchType: "games",
          searchTerms: terms,
          searchPage: 1,
          size: 5,
          searchOptions: {
            games: {
              userId: 0,
              platform: "",
              sortCategory: "popular",
              rangeCategory: "main",
              rangeTime: { min: null, max: null },
              gameplay: {
                perspective: "",
                flow: "",
                genre: "",
                difficulty: "",
              },
              rangeYear: { min: "", max: "" },
              modifier: "",
            },
            users: {},
            lists: { sortCategory: "follows" },
            filter: "",
            sort: 0,
            randomizer: 0,
          },
        }),
      });

      if (!res.ok) {
        this.logger.warn(`HLTB search failed: ${res.status}`);
        await this.cache.setJson(cacheKey, { miss: true }, 3600);
        return null;
      }

      const data = (await res.json()) as {
        data?: Array<{
          game_id?: number;
          game_name?: string;
          comp_main?: number;
          comp_plus?: number;
          comp_100?: number;
        }>;
      };

      const hit =
        (data.data || []).find(
          (g) => g.game_name?.toLowerCase() === title.toLowerCase(),
        ) || data.data?.[0];

      if (!hit) {
        await this.cache.setJson(cacheKey, { miss: true }, 21600);
        return null;
      }

      const toHours = (seconds?: number) =>
        seconds != null && seconds > 0
          ? Math.round((seconds / 3600) * 10) / 10
          : null;

      const result: HltbTimes = {
        mainHours: toHours(hit.comp_main),
        extraHours: toHours(hit.comp_plus),
        completionistHours: toHours(hit.comp_100),
        sourceUrl: hit.game_id
          ? `https://howlongtobeat.com/game/${hit.game_id}`
          : null,
      };
      await this.cache.setJson(cacheKey, result, 86400);
      return result;
    } catch (err) {
      this.logger.warn(`HLTB error for "${title}": ${err}`);
      await this.cache.setJson(cacheKey, { miss: true }, 1800);
      return null;
    }
  }
}
