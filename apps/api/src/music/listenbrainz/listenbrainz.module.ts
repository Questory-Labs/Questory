import { Module } from "@nestjs/common";
import { CatalogModule } from "../catalog/catalog.module";
import { EnrichmentModule } from "../enrichment/enrichment.module";
import { UsersModule } from "../users/users.module";
import { ListenBrainzController } from "./listenbrainz.controller";
import { ListenBrainzService } from "./listenbrainz.service";
import { TokenGuard } from "./token.guard";

@Module({
  imports: [UsersModule, CatalogModule, EnrichmentModule],
  controllers: [ListenBrainzController],
  providers: [ListenBrainzService, TokenGuard],
})
export class ListenBrainzModule {}
