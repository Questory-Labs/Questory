import { Controller, Get, UseGuards } from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ShellNavCountsService } from "./shell-nav-counts.service";

@Controller("shell")
@UseGuards(SteamAuthGuard)
export class ShellNavCountsController {
  constructor(private readonly counts: ShellNavCountsService) {}

  @Get("nav-counts")
  navCounts(@CurrentUser() user: { userId: string }) {
    return this.counts.getCounts(user.userId);
  }
}
