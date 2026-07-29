import { Injectable } from "@nestjs/common";
import { SyncService } from "../sync/sync.service";
import { ImportsService } from "../music/imports/imports.service";
import { LetterboxdService } from "../watch/imports/letterboxd.service";
import { TraktService } from "../watch/trakt/trakt.service";
import { AnilistService } from "../watch/anilist/anilist.service";
import { MalService } from "../watch/mal/mal.service";
import { KitsuService } from "../watch/kitsu/kitsu.service";
import { BangumiService } from "../watch/bangumi/bangumi.service";
import { ShikimoriService } from "../watch/shikimori/shikimori.service";

export type ShellSyncModules = {
  steam?: boolean;
  music?: boolean;
  watch?: boolean;
  read?: boolean;
};

export type ProviderConnStatus = {
  connected: boolean;
  syncing: boolean;
  lastSyncedAt: string | null;
};

export type ShellSyncStatus = {
  steam: {
    active: boolean;
    jobs: {
      id: string;
      type: string;
      status: string;
      error: string | null;
      startedAt: string | null;
      finishedAt: string | null;
    }[];
  };
  music: {
    active: boolean;
    job: {
      id: string;
      source: string;
      status: string;
      fileName?: string | null;
      total: number;
      accepted: number;
      skipped: number;
      processed: number;
      percent: number | null;
      phase: string;
      lastError?: string | null;
      completedAt?: string | null;
    } | null;
  } | null;
  watch: {
    active: boolean;
    letterboxd: {
      id: string;
      source: string;
      status: string;
      fileName?: string | null;
      total: number;
      accepted: number;
      skipped: number;
      processed: number;
      percent: number | null;
      lastError?: string | null;
    } | null;
    trakt: ProviderConnStatus;
    anilist: ProviderConnStatus;
    mal: ProviderConnStatus;
    kitsu: ProviderConnStatus;
    bangumi: ProviderConnStatus;
    shikimori: ProviderConnStatus;
  } | null;
  read: {
    active: boolean;
    anilist: ProviderConnStatus;
    mal: ProviderConnStatus;
    kitsu: ProviderConnStatus;
    bangumi: ProviderConnStatus;
    shikimori: ProviderConnStatus;
  } | null;
};

function isSteamJobActive(status: string | undefined) {
  return status === "pending" || status === "running";
}

function mapProviderStatus(
  conn: {
    connected?: boolean;
    syncing?: boolean;
    lastSyncedAt?: string | null;
  } | null,
): ProviderConnStatus {
  return conn
    ? {
        connected: Boolean(conn.connected),
        syncing: Boolean(conn.syncing),
        lastSyncedAt: conn.lastSyncedAt ?? null,
      }
    : { connected: false, syncing: false, lastSyncedAt: null };
}

@Injectable()
export class ShellSyncStatusService {
  constructor(
    private readonly sync: SyncService,
    private readonly musicImports: ImportsService,
    private readonly letterboxd: LetterboxdService,
    private readonly trakt: TraktService,
    private readonly anilist: AnilistService,
    private readonly mal: MalService,
    private readonly kitsu: KitsuService,
    private readonly bangumi: BangumiService,
    private readonly shikimori: ShikimoriService,
  ) {}

  async getStatus(
    userId: string,
    modules: ShellSyncModules,
  ): Promise<ShellSyncStatus> {
    const wantSteam = modules.steam !== false;
    const wantMusic = modules.music === true;
    const wantWatch = modules.watch === true;
    const wantRead = modules.read === true;

    const [
      jobs,
      musicJob,
      letterboxd,
      trakt,
      anilist,
      mal,
      kitsu,
      bangumi,
      shikimori,
    ] = await Promise.all([
      wantSteam ? this.sync.latestJobs(userId) : Promise.resolve([]),
      wantMusic ? this.musicImports.getActiveJob(userId) : Promise.resolve(null),
      wantWatch ? this.letterboxd.getActiveJob(userId) : Promise.resolve(null),
      wantWatch || wantRead
        ? this.trakt.getConnection(userId)
        : Promise.resolve(null),
      wantWatch || wantRead
        ? this.anilist.getConnection(userId)
        : Promise.resolve(null),
      wantWatch || wantRead
        ? this.mal.getConnection(userId)
        : Promise.resolve(null),
      wantWatch || wantRead
        ? this.kitsu.getConnection(userId)
        : Promise.resolve(null),
      wantWatch || wantRead
        ? this.bangumi.getConnection(userId)
        : Promise.resolve(null),
      wantWatch || wantRead
        ? this.shikimori.getConnection(userId)
        : Promise.resolve(null),
    ]);

    const steamJobs = jobs.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      error: j.error,
      startedAt: j.startedAt?.toISOString() ?? null,
      finishedAt: j.finishedAt?.toISOString() ?? null,
    }));
    const steamActive = steamJobs.some((j) => isSteamJobActive(j.status));

    const music =
      wantMusic
        ? {
            active: musicJob?.status === "running",
            job: musicJob,
          }
        : null;

    const providerSyncing = [
      trakt,
      anilist,
      mal,
      kitsu,
      bangumi,
      shikimori,
    ].some((p) => Boolean(p?.connected && p.syncing));

    const watch =
      wantWatch
        ? {
            active: Boolean(letterboxd || providerSyncing),
            letterboxd,
            trakt: mapProviderStatus(trakt),
            anilist: mapProviderStatus(anilist),
            mal: mapProviderStatus(mal),
            kitsu: mapProviderStatus(kitsu),
            bangumi: mapProviderStatus(bangumi),
            shikimori: mapProviderStatus(shikimori),
          }
        : null;

    const readActive = [anilist, mal, kitsu, bangumi, shikimori].some((p) =>
      Boolean(p?.connected && p.syncing),
    );

    const read =
      wantRead
        ? {
            active: readActive,
            anilist: mapProviderStatus(anilist),
            mal: mapProviderStatus(mal),
            kitsu: mapProviderStatus(kitsu),
            bangumi: mapProviderStatus(bangumi),
            shikimori: mapProviderStatus(shikimori),
          }
        : null;

    return { steam: { active: steamActive, jobs: steamJobs }, music, watch, read };
  }

  fingerprint(status: ShellSyncStatus): string {
    return JSON.stringify(status);
  }

  isAnyActive(status: ShellSyncStatus): boolean {
    return (
      status.steam.active ||
      Boolean(status.music?.active) ||
      Boolean(status.watch?.active) ||
      Boolean(status.read?.active)
    );
  }

  pollIntervalMs(status: ShellSyncStatus): number {
    return this.isAnyActive(status) ? 2_000 : 30_000;
  }
}
