import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StoresModule } from "../stores/stores.module";
import { QmonitorOauthController } from "./qmonitor-oauth.controller";
import { QmonitorOauthService } from "./qmonitor-oauth.service";
import { QmonitorIngestService } from "./qmonitor-ingest.service";
import { QmonitorSessionRulesService } from "./qmonitor-session-rules.service";
import { QmonitorSessionStatsService } from "./qmonitor-session-stats.service";
import { QmonitorSessionsController } from "./qmonitor-sessions.controller";
import { QmonitorSessionsService } from "./qmonitor-sessions.service";
import { QmonitorWebhookController } from "./qmonitor-webhook.controller";
import { QmonitorDevicesController } from "./qmonitor-devices.controller";
import { QmonitorDevicesService } from "./qmonitor-devices.service";

@Module({
  imports: [PrismaModule, StoresModule],
  controllers: [
    QmonitorOauthController,
    QmonitorWebhookController,
    QmonitorSessionsController,
    QmonitorDevicesController,
  ],
  providers: [
    QmonitorOauthService,
    QmonitorIngestService,
    QmonitorSessionRulesService,
    QmonitorSessionStatsService,
    QmonitorSessionsService,
    QmonitorDevicesService,
  ],
  exports: [
    QmonitorOauthService,
    QmonitorIngestService,
    QmonitorSessionRulesService,
    QmonitorSessionsService,
    QmonitorDevicesService,
  ],
})
export class QmonitorModule {}
