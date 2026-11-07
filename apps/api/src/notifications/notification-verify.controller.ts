import { Body, Controller, HttpCode, NotFoundException, Post, Req } from "@nestjs/common";
import type { Request } from "express";
import { NotificationChannelVerifySchema } from "@questorylabs/shared";
import { clientIpFromRequest } from "../auth/abuse/client-ip";
import { NotificationChannelsService } from "./notification-channels.service";

@Controller("notifications/verify")
export class NotificationVerifyController {
  constructor(private readonly channels: NotificationChannelsService) {}

  @Post()
  @HttpCode(200)
  verify(@Req() req: Request, @Body() body: unknown) {
    const parsed = NotificationChannelVerifySchema.safeParse(body);
    if (!parsed.success) throw new NotFoundException("This link is invalid or has expired");
    return this.channels.verify(parsed.data.token, clientIpFromRequest(req));
  }
}
