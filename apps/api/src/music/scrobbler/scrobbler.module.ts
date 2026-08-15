import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { PlayingNowModule } from "../playing-now/playing-now.module";
import { UsersModule } from "../users/users.module";
import { LastFmAuth } from "./lastfm/lastfm.auth";
import { LastFmClient } from "./lastfm/lastfm.client";
import { LastFmController } from "./lastfm/lastfm.controller";
import { LastFmSource } from "./lastfm/lastfm.source";
import { ListenBrainzNativeMutexGuard } from "./listenbrainz-native-mutex.guard";
import { ScrobblerConnections } from "./scrobbler.connections";
import { ScrobblerLoop } from "./scrobbler.loop";
import { SCROBBLE_SOURCES } from "./scrobbler.tokens";
import type { ScrobbleSource } from "./scrobbler.types";

@Module({
  imports: [
    AuthModule,
    UsersModule,
    CatalogModule,
    PlayingNowModule,
    EnrichmentModule,
  ],
  controllers: [LastFmController],
  providers: [
    ScrobblerConnections,
    LastFmClient,
    LastFmSource,
    LastFmAuth,
    ScrobblerLoop,
    ListenBrainzNativeMutexGuard,
    {
      provide: SCROBBLE_SOURCES,
      useFactory: (lastfm: LastFmSource): ScrobbleSource[] => [lastfm],
      inject: [LastFmSource],
    },
  ],
  exports: [
    ScrobblerConnections,
    ListenBrainzNativeMutexGuard,
    SCROBBLE_SOURCES,
  ],
})
export class ScrobblerModule {}
