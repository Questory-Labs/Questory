import { Injectable } from "@nestjs/common";
import { SyncService } from "../sync/sync.service";
import { ImportsService } from "../music/imports/imports.service";
import { LetterboxdService } from "../watch/imports/letterboxd.service";
import { TraktService } from "../watch/trakt/trakt.service";
import { AnilistService } from "../watch/anilist/anilist.service";

export type ShellSyncModules = {
  steam?: boolean;
  music?: boolean;
  watch?: boolean;
  read?: boolean;
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
    trakt: {
      connected: boolean;
      syncing: boolean;
      lastSyncedAt: string | null;
    };
    anilist: {
      connected: boolean;
      syncing: boolean;
      lastSyncedAt: string | null;
    };
  } | null;
  read: {
    active: boolean;
    anilist: {
      connected: boolean;
      syncing: boolean;
      lastSyncedAt: string | null;
    };
  } | null;
};

function isSteamJobActive(status: string | undefined) {
  return status === "pending" || status === "running";
}

@Injectable()
export class ShellSyncStatusService {
  constructor(
    private readonly sync: SyncService,
    private readonly musicImports: ImportsService,
    private readonly letterboxd: LetterboxdService,
    private readonly trakt: TraktService,
    private readonly anilist: AnilistService,
  ) {}

  async getStatus(
    userId: string,
    modules: ShellSyncModules,
  ): Promise<ShellSyncStatus> {
    const wantSteam = modules.steam !== false;
    const wantMusic = modules.music === true;
    const wantWatch = modules.watch === true;
    const wantRead = modules.read === true;

    const [jobs, musicJob, letterboxd, trakt, anilist] = await Promise.all([
      wantSteam ? this.sync.latestJobs(userId) : Promise.resolve([]),
      wantMusic ? this.musicImports.getActiveJob(userId) : Promise.resolve(null),
      wantWatch ? this.letterboxd.getActiveJob(userId) : Promise.resolve(null),
      wantWatch || wantRead
        ? this.trakt.getConnection(userId)
        : Promise.resolve(null),
      wantWatch || wantRead
        ? this.anilist.getConnection(userId)
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
      wantMusic ?
        {
          active: musicJob?.status === "running",
          job: musicJob,
        }
      : null;

    const traktSyncing = Boolean(trakt?.connected && trakt.syncing);
    const anilistSyncing = Boolean(anilist?.connected && anilist.syncing);

    const watch =
      wantWatch ?
        {
          active: Boolean(letterboxd || traktSyncing || anilistSyncing),
          letterboxd,
          trakt:
            trakt ?
              {
                connected: trakt.connected,
                syncing: Boolean(trakt.syncing),
                lastSyncedAt: trakt.lastSyncedAt ?? null,
              }
            : { connected: false, syncing: false, lastSyncedAt: null },
          anilist:
            anilist ?
              {
                connected: anilist.connected,
                syncing: Boolean(anilist.syncing),
                lastSyncedAt: anilist.lastSyncedAt ?? null,
              }
            : { connected: false, syncing: false, lastSyncedAt: null },
        }
      : null;

    const read =
      wantRead ?
        {
          active: anilistSyncing,
          anilist:
            anilist ?
              {
                connected: anilist.connected,
                syncing: Boolean(anilist.syncing),
                lastSyncedAt: anilist.lastSyncedAt ?? null,
              }
            : { connected: false, syncing: false, lastSyncedAt: null },
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
