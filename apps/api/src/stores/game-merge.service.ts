import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ItadService } from "../steam/itad.service";
import {
  normalizeTitle,
  StoreId,
  storeUrl,
} from "./store.constants";

export type UpsertListingInput = {
  store: StoreId;
  externalId: string;
  name: string;
  headerImage?: string | null;
  storeUrl?: string | null;
  isFree?: boolean;
  currentPrice?: number | null;
  lowestPrice?: number | null;
  priceCurrency?: string | null;
  /** Prefer attaching to this user's existing library titles when ITAD misses. */
  userId?: string;
  /** Steam-only convenience. */
  steamAppId?: number | null;
  releaseDate?: Date | null;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
};

@Injectable()
export class GameMergeService {
  private readonly logger = new Logger(GameMergeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly itad: ItadService,
  ) {}

  /**
   * Resolve or create a canonical Game + GameStoreListing for a store title.
   */
  async upsertListing(input: UpsertListingInput) {
    const existingListing = await this.prisma.gameStoreListing.findUnique({
      where: {
        store_externalId: {
          store: input.store,
          externalId: input.externalId,
        },
      },
      include: { game: true },
    });

    const itadId = await this.itad.lookupByShop(input.store, input.externalId);
    // Prefer ITAD identity over an existing listing/appId row so we never try
    // to stamp a duplicate unique itadId onto the wrong Game.
    const itadGame = itadId
      ? await this.prisma.game.findUnique({ where: { itadId } })
      : null;

    let game =
      itadGame ||
      existingListing?.game ||
      null;

    if (!game && input.userId) {
      game = await this.findUserTitleMatch(input.userId, input.name);
    }

    if (!game && input.store === "steam" && input.steamAppId) {
      game = await this.prisma.game.findFirst({
        where: { appId: input.steamAppId },
      });
    }

    // Fold Steam appId / prior listing duplicates into the chosen canonical game.
    if (game && input.store === "steam" && input.steamAppId) {
      const byApp = await this.prisma.game.findFirst({
        where: { appId: input.steamAppId, NOT: { id: game.id } },
      });
      if (byApp) {
        await this.mergeGames(byApp.id, game.id);
        game = (await this.prisma.game.findUnique({ where: { id: game.id } }))!;
      }
    }
    if (game && existingListing && existingListing.gameId !== game.id) {
      await this.mergeGames(existingListing.gameId, game.id);
      game = (await this.prisma.game.findUnique({ where: { id: game.id } }))!;
    }
    if (game && itadId && game.itadId !== itadId) {
      const itadOwner = await this.prisma.game.findUnique({ where: { itadId } });
      if (itadOwner && itadOwner.id !== game.id) {
        await this.mergeGames(game.id, itadOwner.id);
        game = itadOwner;
      }
    }

    const headerImage = input.headerImage ?? null;
    const listingStoreUrl =
      input.storeUrl ?? storeUrl(input.store, input.externalId);

    if (!game) {
      try {
        game = await this.prisma.game.create({
          data: {
            appId: input.store === "steam" ? input.steamAppId ?? null : null,
            name: input.name,
            headerImage,
            releaseDate: input.releaseDate ?? null,
            genres: JSON.stringify(input.genres || []),
            developers: JSON.stringify(input.developers || []),
            publishers: JSON.stringify(input.publishers || []),
            isFree: input.isFree ?? false,
            currentPrice: input.currentPrice ?? null,
            lowestPrice: input.lowestPrice ?? null,
            priceCurrency: input.priceCurrency ?? null,
            itadId: itadId ?? undefined,
          },
        });
      } catch (err) {
        // Concurrent create with same itadId — adopt the winner.
        if (itadId) {
          const existing = await this.prisma.game.findUnique({
            where: { itadId },
          });
          if (existing) {
            game = existing;
          } else {
            throw err;
          }
        } else {
          throw err;
        }
      }
    } else {
      const patch: Record<string, unknown> = {};
      if (itadId && !game.itadId) {
        const owner = await this.prisma.game.findUnique({ where: { itadId } });
        if (!owner) {
          patch.itadId = itadId;
        } else if (owner.id !== game.id) {
          await this.mergeGames(game.id, owner.id);
          game = owner;
        }
      }
      if (input.store === "steam" && input.steamAppId && !game.appId) {
        patch.appId = input.steamAppId;
      }
      if (input.name && (!game.name || game.name.startsWith("App "))) {
        patch.name = input.name;
      }
      if (headerImage && !game.headerImage) patch.headerImage = headerImage;
      if (input.isFree != null) patch.isFree = input.isFree;
      if (Object.keys(patch).length) {
        try {
          game = await this.prisma.game.update({
            where: { id: game.id },
            data: patch,
          });
        } catch (err) {
          // itadId race: another row claimed it — merge into that owner.
          if (itadId && patch.itadId === itadId) {
            const owner = await this.prisma.game.findUnique({
              where: { itadId },
            });
            if (owner && owner.id !== game.id) {
              await this.mergeGames(game.id, owner.id);
              game = owner;
            } else {
              throw err;
            }
          } else {
            throw err;
          }
        }
      }
    }

    const listing = await this.prisma.gameStoreListing.upsert({
      where: {
        store_externalId: {
          store: input.store,
          externalId: input.externalId,
        },
      },
      create: {
        gameId: game.id,
        store: input.store,
        externalId: input.externalId,
        headerImage,
        storeUrl: listingStoreUrl,
        isFree: input.isFree ?? false,
        currentPrice: input.currentPrice ?? null,
        lowestPrice: input.lowestPrice ?? null,
        priceCurrency: input.priceCurrency ?? null,
        priceSyncedAt:
          input.currentPrice != null || input.lowestPrice != null
            ? new Date()
            : null,
      },
      update: {
        gameId: game.id,
        headerImage: headerImage ?? undefined,
        storeUrl: listingStoreUrl,
        isFree: input.isFree ?? undefined,
        ...(input.currentPrice != null || input.lowestPrice != null
          ? {
              currentPrice: input.currentPrice ?? undefined,
              lowestPrice: input.lowestPrice ?? undefined,
              priceCurrency: input.priceCurrency ?? undefined,
              priceSyncedAt: new Date(),
            }
          : {}),
      },
    });

    await this.refreshCanonicalPrices(game.id);
    return { game, listing };
  }

  async upsertOwnership(opts: {
    userId: string;
    gameId: string;
    listingId: string;
    store: StoreId;
    playtimeForever?: number;
    lastPlayedAt?: Date | null;
    pricePaid?: number | null;
    isFamilyShared?: boolean;
  }) {
    const entry = await this.prisma.libraryEntry.upsert({
      where: {
        userId_gameId: { userId: opts.userId, gameId: opts.gameId },
      },
      create: {
        userId: opts.userId,
        gameId: opts.gameId,
        playtimeForever: opts.playtimeForever || 0,
        lastPlayedAt: opts.lastPlayedAt ?? null,
        pricePaid: opts.pricePaid ?? null,
        isFamilyShared: opts.isFamilyShared ?? false,
        syncedAt: new Date(),
      },
      update: {
        syncedAt: new Date(),
      },
    });

    await this.prisma.libraryOwnership.upsert({
      where: {
        libraryEntryId_store: {
          libraryEntryId: entry.id,
          store: opts.store,
        },
      },
      create: {
        libraryEntryId: entry.id,
        store: opts.store,
        listingId: opts.listingId,
        playtimeForever: opts.playtimeForever || 0,
        lastPlayedAt: opts.lastPlayedAt ?? null,
        pricePaid: opts.pricePaid ?? null,
        isFamilyShared: opts.isFamilyShared ?? false,
        syncedAt: new Date(),
      },
      update: {
        listingId: opts.listingId,
        playtimeForever: opts.playtimeForever || 0,
        lastPlayedAt: opts.lastPlayedAt ?? null,
        pricePaid: opts.pricePaid ?? undefined,
        isFamilyShared: opts.isFamilyShared ?? undefined,
        syncedAt: new Date(),
      },
    });

    await this.reaggregateEntry(entry.id);
    return entry;
  }

  async reaggregateEntry(libraryEntryId: string) {
    const ownerships = await this.prisma.libraryOwnership.findMany({
      where: { libraryEntryId },
    });
    if (!ownerships.length) return;

    const playtimeForever = Math.max(
      ...ownerships.map((o) => o.playtimeForever || 0),
      0,
    );
    const lastPlayedAt = ownerships
      .map((o) => o.lastPlayedAt)
      .filter((d): d is Date => d != null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const pricePaid =
      ownerships.map((o) => o.pricePaid).find((p) => p != null) ?? null;
    const isFamilyShared = ownerships.every((o) => o.isFamilyShared);

    await this.prisma.libraryEntry.update({
      where: { id: libraryEntryId },
      data: {
        playtimeForever,
        lastPlayedAt,
        pricePaid: pricePaid ?? undefined,
        isFamilyShared,
      },
    });
  }

  async refreshCanonicalPrices(gameId: string) {
    const listings = await this.prisma.gameStoreListing.findMany({
      where: { gameId },
    });
    if (!listings.length) return;

    const currents = listings
      .map((l) => (l.isFree ? 0 : l.currentPrice))
      .filter((p): p is number => p != null);
    const lowests = listings
      .map((l) => (l.isFree ? 0 : l.lowestPrice ?? l.currentPrice))
      .filter((p): p is number => p != null);

    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        currentPrice: currents.length ? Math.min(...currents) : undefined,
        lowestPrice: lowests.length ? Math.min(...lowests) : undefined,
        isFree: listings.some((l) => l.isFree),
        priceCurrency:
          listings.find((l) => l.priceCurrency)?.priceCurrency ?? undefined,
        priceSyncedAt: listings.some((l) => l.priceSyncedAt)
          ? new Date()
          : undefined,
        headerImage:
          listings.find((l) => l.headerImage)?.headerImage ?? undefined,
      },
    });
  }

  /** Move relations from source game onto target, then delete source. */
  private async mergeGames(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    this.logger.log(`Merging game ${sourceId} → ${targetId}`);

    const [source, target] = await Promise.all([
      this.prisma.game.findUnique({ where: { id: sourceId } }),
      this.prisma.game.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) return;

    const fieldPatch: Record<string, unknown> = {};
    if (!target.itadId && source.itadId) fieldPatch.itadId = source.itadId;
    if (!target.appId && source.appId) fieldPatch.appId = source.appId;
    if (
      source.name &&
      (!target.name || target.name.startsWith("App "))
    ) {
      fieldPatch.name = source.name;
    }
    if (!target.headerImage && source.headerImage) {
      fieldPatch.headerImage = source.headerImage;
    }
    if (!target.metadataSyncedAt && source.metadataSyncedAt) {
      fieldPatch.metadataSyncedAt = source.metadataSyncedAt;
    }
    if (!target.deckStatus && source.deckStatus) {
      fieldPatch.deckStatus = source.deckStatus;
    }
    if (Object.keys(fieldPatch).length) {
      try {
        await this.prisma.game.update({
          where: { id: targetId },
          data: fieldPatch,
        });
      } catch (err) {
        this.logger.warn(
          `Could not copy fields while merging ${sourceId} → ${targetId}: ${err}`,
        );
      }
    }

    await this.reassignListings(sourceId, targetId);
    await this.prisma.wishlistItem.updateMany({
      where: { gameId: sourceId },
      data: { gameId: targetId },
    });
    await this.prisma.purchase.updateMany({
      where: { gameId: sourceId },
      data: { gameId: targetId },
    });
    await this.reassignCollectionItems(sourceId, targetId);
    await this.reassignLibraryEntries(sourceId, targetId);

    try {
      await this.prisma.game.delete({ where: { id: sourceId } });
    } catch (err) {
      this.logger.warn(`Could not delete merged game ${sourceId}: ${err}`);
    }
    await this.refreshCanonicalPrices(targetId);
  }

  /** Move store listings; drop source rows that collide on (store, externalId). */
  private async reassignListings(sourceId: string, targetId: string) {
    const sourceListings = await this.prisma.gameStoreListing.findMany({
      where: { gameId: sourceId },
    });
    for (const listing of sourceListings) {
      const conflict = await this.prisma.gameStoreListing.findUnique({
        where: {
          store_externalId: {
            store: listing.store,
            externalId: listing.externalId,
          },
        },
      });
      if (conflict && conflict.id !== listing.id) {
        // Target (or another game) already owns this shop id — drop duplicate.
        await this.prisma.libraryOwnership.updateMany({
          where: { listingId: listing.id },
          data: { listingId: conflict.id },
        });
        await this.prisma.gameStoreListing.delete({ where: { id: listing.id } });
        continue;
      }
      await this.prisma.gameStoreListing.update({
        where: { id: listing.id },
        data: { gameId: targetId },
      });
    }
  }

  /** Move collection rows; delete source items already present on target. */
  private async reassignCollectionItems(sourceId: string, targetId: string) {
    const items = await this.prisma.collectionItem.findMany({
      where: { gameId: sourceId },
    });
    for (const item of items) {
      const conflict = await this.prisma.collectionItem.findUnique({
        where: {
          collectionId_gameId: {
            collectionId: item.collectionId,
            gameId: targetId,
          },
        },
      });
      if (conflict) {
        await this.prisma.collectionItem.delete({ where: { id: item.id } });
      } else {
        await this.prisma.collectionItem.update({
          where: { id: item.id },
          data: { gameId: targetId },
        });
      }
    }
  }

  private async reassignLibraryEntries(sourceId: string, targetId: string) {
    const sourceEntries = await this.prisma.libraryEntry.findMany({
      where: { gameId: sourceId },
      include: { ownerships: true },
    });
    for (const src of sourceEntries) {
      const existing = await this.prisma.libraryEntry.findUnique({
        where: {
          userId_gameId: { userId: src.userId, gameId: targetId },
        },
      });
      if (!existing) {
        await this.prisma.libraryEntry.update({
          where: { id: src.id },
          data: { gameId: targetId },
        });
        continue;
      }
      for (const o of src.ownerships) {
        await this.prisma.libraryOwnership.upsert({
          where: {
            libraryEntryId_store: {
              libraryEntryId: existing.id,
              store: o.store,
            },
          },
          create: {
            libraryEntryId: existing.id,
            store: o.store,
            listingId: o.listingId,
            playtimeForever: o.playtimeForever,
            lastPlayedAt: o.lastPlayedAt,
            pricePaid: o.pricePaid,
            isFamilyShared: o.isFamilyShared,
            syncedAt: o.syncedAt,
          },
          update: {
            listingId: o.listingId ?? undefined,
            playtimeForever: Math.max(o.playtimeForever, 0),
            lastPlayedAt: o.lastPlayedAt ?? undefined,
          },
        });
      }
      await this.prisma.libraryEntry.delete({ where: { id: src.id } });
      await this.reaggregateEntry(existing.id);
    }
  }

  private async findUserTitleMatch(userId: string, name: string) {
    const needle = normalizeTitle(name);
    if (!needle || needle.length < 3) return null;
    const entries = await this.prisma.libraryEntry.findMany({
      where: { userId, hidden: false },
      include: { game: true },
      take: 500,
    });
    for (const e of entries) {
      if (normalizeTitle(e.game.name) === needle) return e.game;
    }
    return null;
  }
}
