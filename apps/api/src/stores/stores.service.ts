import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GameMergeService } from "./game-merge.service";
import { ItadService } from "../steam/itad.service";
import { StoreId, STORES, isStoreId } from "./store.constants";
import { currencyFromCountry } from "../lib/currency";

@Injectable()
export class StoresService implements OnModuleInit {
  private readonly logger = new Logger(StoresService.name);
  private backfillDone = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly merge: GameMergeService,
    private readonly itad: ItadService,
  ) {}

  async onModuleInit() {
    void this.backfillSteamListings().catch((err) =>
      this.logger.warn(`Steam listing backfill: ${err}`),
    );
  }

  /** One-time: create GameStoreListing + LibraryOwnership for existing Steam data. */
  async backfillSteamListings() {
    if (this.backfillDone) return;
    const games = await this.prisma.game.findMany({
      where: { appId: { not: null } },
      take: 5000,
    });
    let created = 0;
    for (const game of games) {
      if (game.appId == null) continue;
      const externalId = String(game.appId);
      const existing = await this.prisma.gameStoreListing.findUnique({
        where: {
          store_externalId: { store: "steam", externalId },
        },
      });
      if (!existing) {
        await this.prisma.gameStoreListing.create({
          data: {
            gameId: game.id,
            store: "steam",
            externalId,
            headerImage: game.headerImage,
            storeUrl: `https://store.steampowered.com/app/${externalId}`,
            isFree: game.isFree,
            currentPrice: game.currentPrice,
            lowestPrice: game.lowestPrice,
            priceCurrency: game.priceCurrency,
            priceSyncedAt: game.priceSyncedAt,
          },
        });
        created += 1;
      }
    }

    const entries = await this.prisma.libraryEntry.findMany({
      include: { game: true, ownerships: true },
      take: 20000,
    });
    for (const entry of entries) {
      if (entry.ownerships.length) continue;
      if (entry.game.appId == null) continue;
      const listing = await this.prisma.gameStoreListing.findUnique({
        where: {
          store_externalId: {
            store: "steam",
            externalId: String(entry.game.appId),
          },
        },
      });
      await this.prisma.libraryOwnership.create({
        data: {
          libraryEntryId: entry.id,
          store: "steam",
          listingId: listing?.id,
          playtimeForever: entry.playtimeForever,
          lastPlayedAt: entry.lastPlayedAt,
          pricePaid: entry.pricePaid,
          isFamilyShared: entry.isFamilyShared,
        },
      });
    }

    const wish = await this.prisma.wishlistItem.findMany({ take: 20000 });
    for (const w of wish) {
      if (w.externalId && w.store) continue;
      if (w.appId == null) continue;
      try {
        await this.prisma.wishlistItem.update({
          where: { id: w.id },
          data: {
            store: "steam",
            externalId: String(w.appId),
          },
        });
      } catch {
        /* unique conflict — skip */
      }
    }

    this.backfillDone = true;
    if (created) this.logger.log(`Backfilled ${created} Steam store listings`);
  }

  async listStatus(_userId: string) {
    return STORES.map((store) => {
      if (store === "steam") {
        return {
          store,
          connected: true,
          syncEnabled: true as const,
          status: "connected" as const,
          displayName: null as string | null,
          externalUserId: null as string | null,
          lastSyncedAt: null as string | null,
        };
      }
      return {
        store,
        connected: false,
        syncEnabled: false as const,
        status: "coming_later" as const,
        displayName: null as string | null,
        externalUserId: null as string | null,
        lastSyncedAt: null as string | null,
      };
    });
  }

  /** Remove leftover Epic/GOG ownerships or accounts from earlier experiments. */
  async unlink(userId: string, store: string) {
    if (!isStoreId(store) || store === "steam") {
      throw new Error("Cannot unlink this store");
    }
    await this.prisma.storeAccount.deleteMany({
      where: { userId, store },
    });
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, store },
    });
    const ownerships = await this.prisma.libraryOwnership.findMany({
      where: { store, libraryEntry: { userId } },
      include: { libraryEntry: true },
    });
    for (const o of ownerships) {
      await this.prisma.libraryOwnership.delete({ where: { id: o.id } });
      const remaining = await this.prisma.libraryOwnership.count({
        where: { libraryEntryId: o.libraryEntryId },
      });
      if (remaining === 0) {
        await this.prisma.libraryEntry.delete({
          where: { id: o.libraryEntryId },
        });
      } else {
        await this.merge.reaggregateEntry(o.libraryEntryId);
      }
    }
    return { ok: true };
  }

  /** Refresh ITAD prices for any store listings the user owns (incl. future manual). */
  async applyListingPrices(
    userId: string,
    store: StoreId,
    countryCode: string,
  ) {
    const ownerships = await this.prisma.libraryOwnership.findMany({
      where: { store, libraryEntry: { userId } },
      include: { listing: true },
    });
    const ids = ownerships
      .map((o) => o.listing?.externalId)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) return;

    const prices = await this.itad.getPricesForStore(store, ids, countryCode);
    const currency = currencyFromCountry(countryCode);

    for (const o of ownerships) {
      if (!o.listing) continue;
      const p = prices[o.listing.externalId];
      if (!p || (p.current == null && p.lowest == null)) continue;
      const current = p.current;
      const lowest =
        p.lowest != null && current != null
          ? Math.min(p.lowest, current)
          : (p.lowest ?? current);
      const listingCurrency = p.currency ?? currency;
      await this.prisma.gameStoreListing.update({
        where: { id: o.listing.id },
        data: {
          currentPrice: current,
          lowestPrice: lowest,
          priceCurrency: listingCurrency,
          priceSyncedAt: new Date(),
          isFree: current === 0,
        },
      });
      await this.merge.refreshCanonicalPrices(o.listing.gameId);
    }
  }
}
