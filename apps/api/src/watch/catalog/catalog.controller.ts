import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { WatchTitleUpdateSchema } from "@questorylabs/shared";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CatalogService } from "./catalog.service";

@Controller("watch/catalog")
@UseGuards(SessionUserGuard)
export class WatchCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Patch("titles/:id")
  updateTitle(@Param("id") id: string, @Body() body: unknown) {
    const parsed = WatchTitleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.catalog.updateTitle(id, parsed.data);
  }
}
