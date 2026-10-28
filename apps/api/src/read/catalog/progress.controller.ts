import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ReadProgressBodySchema } from "@questorylabs/shared";
import { ReadSessionUserGuard } from "../auth/session-user.guard";
import { CurrentReadUserId } from "../auth/current-read-user.decorator";
import { ReadProgressService } from "./progress.service";

@Controller("read/titles")
@UseGuards(ReadSessionUserGuard)
export class ReadProgressController {
  constructor(private readonly progress: ReadProgressService) {}

  @Post(":id/progress")
  log(
    @CurrentReadUserId() userId: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = ReadProgressBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.progress.log(userId, id, parsed.data);
  }
}
