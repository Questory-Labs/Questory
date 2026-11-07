import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { ApiKeysService } from "./api-keys.service";

const CreateApiKeySchema = z.object({
  type: z.string().optional(),
  label: z.string().nullish(),
});

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

  @Get("public")
  listPublic(@CurrentUser() user: { userId: string }) {
    return this.apiKeys.listPublic(user.userId);
  }

  @Post("public")
  createPublic(@CurrentUser() user: { userId: string }, @Body() body: unknown) {
    return this.apiKeys.createPublic(user.userId, body);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: unknown,
  ) {
    const parsed = CreateApiKeySchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.apiKeys.create(user.userId, {
      type: parsed.data.type || "",
      label: parsed.data.label,
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
