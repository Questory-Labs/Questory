import { Controller, Get, UseGuards } from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ConnectionsService } from "./connections.service";

@Controller("connections")
@UseGuards(SteamAuthGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  overview(@CurrentUser() user: { userId: string }) {
    return this.connections.overview(user.userId);
  }
}
