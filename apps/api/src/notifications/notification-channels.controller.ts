import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  NotificationChannelCreateSchema,
  NotificationChannelUpdateSchema,
} from "@questorylabs/shared";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { NotificationChannelsService } from "./notification-channels.service";

@Controller("notifications/channels")
@UseGuards(SteamAuthGuard)
export class NotificationChannelsController {
  constructor(private readonly channels: NotificationChannelsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.channels.list(user.userId);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() body: unknown) {
    const parsed = NotificationChannelCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.channels.create(user.userId, parsed.data);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = NotificationChannelUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.channels.update(user.userId, id, parsed.data);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.channels.remove(user.userId, id);
  }

  @Post(":id/resend-verification")
  resendVerification(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.channels.resendVerification(user.userId, id);
  }

  @Post(":id/test")
  test(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.channels.test(user.userId, id);
  }
}
