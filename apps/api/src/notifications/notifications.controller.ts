import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { NotificationsService } from "./notifications.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("notifications")
@UseGuards(SteamAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query("unread") unread?: string,
  ) {
    return this.notifications.list(user.userId, unread === "true");
  }

  @Get("unread-count")
  async unreadCount(@CurrentUser() user: { userId: string }) {
    const count = await this.notifications.unreadCount(user.userId);
    return { count };
  }

  @Post("read")
  markAllRead(@CurrentUser() user: { userId: string }) {
    return this.notifications.markRead(user.userId);
  }

  @Post(":id/read")
  markRead(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.notifications.markRead(user.userId, id);
  }
}
