import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ApiKeysService } from "./api-keys.service";

@Controller("api-keys")
@UseGuards(SteamAuthGuard)
export class ApiKeysController {
  constructor(private readonly apiKeys: ApiKeysService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.apiKeys.list(user.userId);
  }

  @Get("identity")
  identity(@CurrentUser() user: { userId: string }) {
    return this.apiKeys.identity(user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: { type?: string; label?: string },
  ) {
    return this.apiKeys.create(user.userId, {
      type: body.type || "",
      label: body.label,
    });
  }

  @Delete(":id")
  revoke(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.apiKeys.revoke(user.userId, id);
  }
}
