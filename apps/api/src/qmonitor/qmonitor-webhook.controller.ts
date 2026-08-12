import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { QmonitorIngestService } from "./qmonitor-ingest.service";
import { QmonitorOauthService } from "./qmonitor-oauth.service";

@Controller({ path: "webhooks", version: VERSION_NEUTRAL })
export class QmonitorWebhookController {
  constructor(
    private readonly ingest: QmonitorIngestService,
    private readonly oauth: QmonitorOauthService,
  ) {}

  @Post("qmonitor")
  @HttpCode(200)
  async qmonitor(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ) {
    const { userId } = await this.oauth.resolveAccessUser(authorization);
    return this.ingest.ingest(userId, body);
  }
}
