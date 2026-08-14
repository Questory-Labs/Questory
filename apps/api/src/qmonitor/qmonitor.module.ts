import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StoresModule } from "../stores/stores.module";
import { QmonitorOauthController } from "./qmonitor-oauth.controller";
import { QmonitorOauthService } from "./qmonitor-oauth.service";
import { QmonitorIngestService } from "./qmonitor-ingest.service";
import { QmonitorSessionRulesService } from "./qmonitor-session-rules.service";
import { QmonitorSessionsController } from "./qmonitor-sessions.controller";
import { QmonitorSessionsService } from "./qmonitor-sessions.service";
import { QmonitorWebhookController } from "./qmonitor-webhook.controller";

@Module({
  imports: [PrismaModule, StoresModule],
  controllers: [
    QmonitorOauthController,
    QmonitorWebhookController,
    QmonitorSessionsController,
  ],
  providers: [
    QmonitorOauthService,
    QmonitorIngestService,
    QmonitorSessionRulesService,
    QmonitorSessionsService,
  ],
  exports: [
    QmonitorOauthService,
    QmonitorIngestService,
    QmonitorSessionRulesService,
    QmonitorSessionsService,
  ],
})
export class QmonitorModule {}
