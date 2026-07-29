import {
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { StoresService } from "./stores.service";

@Controller()
export class StoresController {
  constructor(private readonly stores: StoresService) {}

  @Get("stores")
  @UseGuards(SteamAuthGuard)
  list(@CurrentUser() user: { userId: string }) {
    return this.stores.listStatus(user.userId);
  }

  @Delete("stores/:store")
  @UseGuards(SteamAuthGuard)
  unlink(
    @CurrentUser() user: { userId: string },
    @Param("store") store: string,
  ) {
    return this.stores.unlink(user.userId, store);
  }
}
