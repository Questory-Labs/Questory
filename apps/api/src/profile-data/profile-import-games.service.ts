import { Injectable } from "@nestjs/common";
import type { QuestoryProfileArchive } from "@questorylabs/shared";
import { PrismaService } from "../prisma/prisma.service";
import { GameMergeService } from "../stores/game-merge.service";
import { isStoreId, type StoreId } from "../stores/store.constants";
import { QmonitorSessionRulesService } from "../qmonitor/qmonitor-session-rules.service";
import { yieldEventLoop } from "./profile-data.utils";
import { PROFILE_EXPORT_YIELD_EVERY } from "./profile-data.constants";
import { sessionMatchIdentity } from "../qmonitor/session-identity";

export type ApplyCounts = { accepted: number; skipped: number };

@Injectable()
export class ProfileImportGamesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly merge: GameMergeService,
    private readonly sessionRules: QmonitorSessionRulesService,
  ) {}

  async applyProfile(userId: string, archive: QuestoryProfileArchive) {
    const countryCode = archive.profile.countryCode;
    if (countryCode !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          countryCode,
          ...(archive.profile.priceRegionLocked != null
            ? { priceRegionLocked: archive.profile.priceRegionLocked }
            : {}),
        },
      });
    }
  }

  async applyLibrary(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    let n = 0;
    for (const row of archive.library) {
      const game = await this.resolveGame(userId, row);
      if (!game) {
        skipped += 1;
        continue;
      }
      const existing = await this.prisma.libraryEntry.findUnique({
        where: { userId_gameId: { userId, gameId: game.id } },
      });
      const playtimeForever = Math.max(
        existing?.playtimeForever ?? 0,
        row.playtimeForever ?? 0,
      );
      await this.prisma.libraryEntry.upsert({
        where: { userId_gameId: { userId, gameId: game.id } },
        create: {
          userId,
          gameId: game.id,
          playtimeForever,
          playtime2Weeks: row.playtime2Weeks ?? null,
          lastPlayedAt: row.lastPlayedAt ? new Date(row.lastPlayedAt) : null,
          pricePaid: row.pricePaid ?? null,
          purchasedAt: row.purchasedAt ? new Date(row.purchasedAt) : null,
          hidden: row.hidden ?? false,
          isFamilyShared: row.isFamilyShared ?? false,
        },
        update: {
          playtimeForever,
          ...(row.pricePaid != null ? { pricePaid: row.pricePaid } : {}),
          ...(row.purchasedAt
            ? { purchasedAt: new Date(row.purchasedAt) }
            : {}),
          ...(row.hidden != null ? { hidden: row.hidden } : {}),
        },
      });
      accepted += 1;
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }
    return { accepted, skipped };
  }

  async applyWishlist(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    for (const row of archive.wishlistTargets) {
      const store = isStoreId(row.store) ? row.store : "steam";
      try {
        await this.prisma.wishlistItem.upsert({
          where: {
            userId_store_externalId: {
              userId,
              store,
              externalId: row.externalId,
            },
          },
          create: {
            userId,
            store,
            externalId: row.externalId,
            appId: row.appId ?? null,
            name: row.name ?? null,
            targetPrice: row.targetPrice,
            priority: row.priority ?? 0,
            dateAdded: row.dateAdded ? new Date(row.dateAdded) : null,
          },
          update: { targetPrice: row.targetPrice },
        });
        accepted += 1;
      } catch {
        skipped += 1;
      }
    }
    return { accepted, skipped };
  }

  async applyPurchases(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    for (const row of archive.purchases) {
      const purchasedAt = new Date(row.purchasedAt);
      const existing = await this.prisma.purchase.findFirst({
        where: {
          userId,
          store: row.store,
          amount: row.amount,
          source: row.source,
          purchasedAt,
          ...(row.externalId ? { externalId: row.externalId } : {}),
          ...(row.appId != null ? { appId: row.appId } : {}),
        },
      });
      if (existing) {
        skipped += 1;
        continue;
      }
      await this.prisma.purchase.create({
        data: {
          userId,
          store: row.store,
          externalId: row.externalId ?? null,
          appId: row.appId ?? null,
          amount: row.amount,
          currency: row.currency,
          purchasedAt,
          source: row.source,
          discountPct: row.discountPct ?? null,
        },
      });
      accepted += 1;
    }
    return { accepted, skipped };
  }

  async applyCollections(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    for (const row of archive.collections) {
      let collection = await this.prisma.collection.findFirst({
        where: { userId, name: row.name, type: "custom" },
      });
      if (!collection) {
        collection = await this.prisma.collection.create({
          data: {
            userId,
            name: row.name,
            type: "custom",
            description: row.description ?? null,
          },
        });
      }
      for (const item of row.items) {
        const game = await this.resolveGame(userId, item);
        if (!game) {
          skipped += 1;
          continue;
        }
        await this.prisma.collectionItem.upsert({
          where: {
            collectionId_gameId: {
              collectionId: collection.id,
              gameId: game.id,
            },
          },
          create: { collectionId: collection.id, gameId: game.id },
          update: {},
        });
        accepted += 1;
      }
    }
    return { accepted, skipped };
  }

  async applyPlaySessionRules(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    for (const row of archive.playSessionRules) {
      const game = await this.resolveGame(userId, row.target);
      if (!game) {
        skipped += 1;
        continue;
      }
      await this.prisma.userPlaySessionRule.upsert({
        where: { userId_matchKey: { userId, matchKey: row.matchKey } },
        create: {
          userId,
          matchKey: row.matchKey,
          matchExeNorm: row.matchExeNorm ?? "",
          matchTitleNorm: row.matchTitleNorm,
          targetGameId: game.id,
        },
        update: { targetGameId: game.id },
      });
      accepted += 1;
    }
    this.sessionRules.invalidateRulesCache(userId);
    return { accepted, skipped };
  }

  async applyPlaySessions(
    userId: string,
    archive: QuestoryProfileArchive,
  ): Promise<ApplyCounts> {
    let accepted = 0;
    let skipped = 0;
    let n = 0;
    for (const row of archive.playSessions) {
      let gameId: string | null = null;
      let appId = row.appId ?? null;
      const identity = sessionMatchIdentity(row.exe, row.title);
      const ruled = await this.sessionRules.resolveTarget(
        userId,
        row.title,
        row.exe,
      );
      if (ruled) {
        gameId = ruled.gameId;
        appId = ruled.appId ?? appId;
      } else if (appId) {
        const game = await this.resolveGame(userId, {
          store: "steam",
          externalId: String(appId),
          appId,
          name: row.title,
        });
        gameId = game?.id ?? null;
      }
      const startedAt = new Date(row.startedAt);
      const endedAt = new Date(row.endedAt);
      await this.prisma.playSession.upsert({
        where: { userId_externalId: { userId, externalId: row.externalId } },
        create: {
          userId,
          gameId,
          appId,
          title: row.title,
          source: row.source,
          externalId: row.externalId,
          startedAt,
          endedAt,
          durationSecs: row.durationSecs,
          exe: row.exe ?? null,
          hostOs: row.hostOs ?? null,
          hostName: row.hostName ?? null,
        },
        update: {},
      });
      accepted += 1;
      n += 1;
      if (n % PROFILE_EXPORT_YIELD_EVERY === 0) await yieldEventLoop();
    }
    return { accepted, skipped };
  }

  async applyFamily(userId: string, archive: QuestoryProfileArchive) {
    if (!archive.family) return { accepted: 0, skipped: 0 };
    let group = await this.prisma.familyGroup.findFirst({
      where: { ownerId: userId },
    });
    if (!group) {
      group = await this.prisma.familyGroup.create({
        data: { ownerId: userId, name: archive.family.name },
      });
    } else if (archive.family.name && archive.family.name !== group.name) {
      group = await this.prisma.familyGroup.update({
        where: { id: group.id },
        data: { name: archive.family.name },
      });
    }
    let accepted = 0;
    for (const member of archive.family.members) {
      await this.prisma.familyMember.upsert({
        where: {
          groupId_steamId: { groupId: group.id, steamId: member.steamId },
        },
        create: {
          groupId: group.id,
          steamId: member.steamId,
          personaName: member.personaName,
          avatarUrl: member.avatarUrl ?? null,
          role: member.role,
        },
        update: {
          personaName: member.personaName,
          role: member.role,
        },
      });
      accepted += 1;
    }
    return { accepted, skipped: 0 };
  }

  private async resolveGame(
    userId: string,
    ref: {
      store: string;
      externalId: string;
      appId?: number | null;
      name?: string;
    },
  ) {
    const store: StoreId = isStoreId(ref.store) ? ref.store : "steam";
    const steamAppId =
      ref.appId ??
      (store === "steam" && /^\d+$/.test(ref.externalId)
        ? Number(ref.externalId)
        : null);
    const { game } = await this.merge.upsertListing({
      store,
      externalId: ref.externalId,
      name: ref.name || ref.externalId,
      steamAppId,
      userId,
    });
    return game;
  }
}
