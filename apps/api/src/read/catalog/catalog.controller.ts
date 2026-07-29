import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ReadTitleUpdateSchema } from "@questorylabs/shared";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { ReadCatalogService } from "./catalog.service";

@Controller("read/catalog")
@UseGuards(ReadSessionUserGuard)
export class ReadCatalogController {
  constructor(private readonly catalog: ReadCatalogService) {}

  @Patch("titles/:id")
  updateTitle(@Param("id") id: string, @Body() body: unknown) {
    const parsed = ReadTitleUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.catalog.updateTitle(id, parsed.data);
  }
}
