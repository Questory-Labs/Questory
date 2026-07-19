import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";

@Controller({ path: "webhooks", version: VERSION_NEUTRAL })
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post("plex")
  plex(
    @Body() body: Record<string, unknown> | { payload?: string },
    @Headers("x-watch-webhook-secret") secret?: string,
    @Req() req?: { body?: unknown },
  ) {
    // Plex often sends multipart with a `payload` JSON string
    let parsed: Record<string, unknown> = {};
    if (body && typeof body === "object" && "payload" in body && typeof body.payload === "string") {
      try {
        parsed = JSON.parse(body.payload) as Record<string, unknown>;
      } catch {
        parsed = body as Record<string, unknown>;
      }
    } else {
      parsed = (body || req?.body || {}) as Record<string, unknown>;
    }
    return this.webhooks.handlePlex(parsed, secret);
  }

  @Post("jellyfin")
  jellyfin(
    @Body() body: Record<string, unknown>,
    @Headers("x-watch-webhook-secret") secret?: string,
  ) {
    return this.webhooks.handleJellyfin(body || {}, secret);
  }
}
