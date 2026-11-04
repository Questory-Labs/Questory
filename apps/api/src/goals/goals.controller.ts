import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  GoalCreateSchema,
  GoalListQuerySchema,
  GoalUpdateSchema,
} from "@questorylabs/shared";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { GoalsService } from "./goals.service";

@Controller("goals")
@UseGuards(SteamAuthGuard)
export class GoalsController {
  constructor(private readonly goals: GoalsService) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query() query: Record<string, string | undefined>,
  ) {
    const parsed = GoalListQuerySchema.safeParse({
      domain: query.domain || undefined,
      status: query.status || undefined,
      timeframe: query.timeframe || undefined,
      limit: query.limit || undefined,
    });
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.goals.list(user.userId, parsed.data);
  }

  @Post()
  create(@CurrentUser() user: { userId: string }, @Body() body: unknown) {
    const parsed = GoalCreateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.goals.create(user.userId, parsed.data);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const parsed = GoalUpdateSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.flatten());
    return this.goals.update(user.userId, id, parsed.data);
  }

  @Delete(":id")
  remove(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.goals.remove(user.userId, id);
  }
}
