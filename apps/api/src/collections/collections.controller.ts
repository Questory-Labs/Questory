import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CollectionsService } from "./collections.service";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("collections")
@UseGuards(SteamAuthGuard)
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.collections.list(user.userId);
  }

  @Get(":id")
  getOne(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.collections.getOne(user.userId, id);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: { name: string; description?: string },
  ) {
    return this.collections.createCustom(
      user.userId,
      body.name,
      body.description,
    );
  }

  @Patch(":id")
  update(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: { name?: string; description?: string },
  ) {
    return this.collections.updateCustom(user.userId, id, body);
  }

  @Delete(":id")
  remove(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.collections.removeCustom(user.userId, id);
  }

  @Post(":id/games")
  addGame(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: { appId: number },
  ) {
    return this.collections.addGame(user.userId, id, body.appId);
  }
}
