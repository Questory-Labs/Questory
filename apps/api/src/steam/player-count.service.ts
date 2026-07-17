import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { IgdbService } from "./igdb.service";
import {
  isPlayerCountFresh,
  parsePlayerMaxes,
  playerCountsFromTagNames,
  stringifyPlayerMaxes,
  type PlayerCountsResult,
} from "../lib/player-counts";
import { parseStringArray } from "../lib/json-arrays";

type GamePlayerCountFields = {
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playerMaxes?: string | null;
  playerCountSource?: string | null;
  playerCountSyncedAt?: Date | null;
  tags?: string;
  categories?: string;
};

@Injectable()
export class PlayerCountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly igdb: IgdbService,
  ) {}

  /**
   * IGDB first, then exact Steam numbered tags. Persists when a game row exists.
   */
  async resolveForSteamApp(
    steamAppId: number,
    options?: {
      preferredMode?: "local_coop" | "online_coop" | "pvp" | "crossplay";
      force?: boolean;
      game?: GamePlayerCountFields | null;
    },
  ): Promise<PlayerCountsResult | null> {
    let game: GamePlayerCountFields | null | undefined = options?.game;
    if (game === undefined) {
      game = await this.prisma.game.findFirst({ where: { appId: steamAppId } });
    }

    if (
      !options?.force &&
      game &&
      isPlayerCountFresh(game.playerCountSyncedAt ?? null) &&
      game.maxPlayers != null
    ) {
      const playerMaxes = parsePlayerMaxes(game.playerMaxes);
      return {
        minPlayers: game.minPlayers ?? (game.maxPlayers >= 2 ? 2 : 1),
        maxPlayers: game.maxPlayers,
        playerMaxes:
          playerMaxes.length > 0 ? playerMaxes : [game.maxPlayers],
        source: (game.playerCountSource as "igdb" | "steam_tag") || "igdb",
      };
    }

    const fromIgdb = await this.igdb.getPlayerCountsForSteamApp(
      steamAppId,
      options?.preferredMode,
    );
    if (fromIgdb) {
      await this.persist(steamAppId, fromIgdb);
      return fromIgdb;
    }

    const tags = parseStringArray(game?.tags || "[]");
    const categories = parseStringArray(game?.categories || "[]");
    const fromTags = playerCountsFromTagNames(tags, categories);
    if (fromTags) {
      await this.persist(steamAppId, fromTags);
      return fromTags;
    }

    // Mark attempt so we don't hammer IGDB every plan request.
    await this.prisma.game
      .updateMany({
        where: { appId: steamAppId },
        data: {
          playerCountSyncedAt: new Date(),
          playerCountSource: null,
        },
      })
      .catch(() => undefined);

    return null;
  }

  private async persist(steamAppId: number, counts: PlayerCountsResult) {
    await this.prisma.game
      .updateMany({
        where: { appId: steamAppId },
        data: {
          minPlayers: counts.minPlayers,
          maxPlayers: counts.maxPlayers,
          playerMaxes: stringifyPlayerMaxes(counts.playerMaxes),
          playerCountSource: counts.source,
          playerCountSyncedAt: new Date(),
        },
      })
      .catch(() => undefined);
  }
}
