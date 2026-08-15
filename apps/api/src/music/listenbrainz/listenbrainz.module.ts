import { Module, forwardRef } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { PlayingNowModule } from "../playing-now/playing-now.module";
import { UsersModule } from "../users/users.module";
import { ScrobblerModule } from "../scrobbler/scrobbler.module";
import { ListenBrainzController } from "./listenbrainz.controller";
import { ListenBrainzService } from "./listenbrainz.service";
import { TokenGuard } from "./token.guard";

@Module({
  imports: [
    UsersModule,
    CatalogModule,
    EnrichmentModule,
    PlayingNowModule,
    forwardRef(() => ScrobblerModule),
  ],
  controllers: [ListenBrainzController],
  providers: [ListenBrainzService, TokenGuard],
})
export class ListenBrainzModule {}
