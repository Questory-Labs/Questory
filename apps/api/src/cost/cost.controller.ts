import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  CostRoiSortSchema,
  CostRoiValueFilterSchema,
  parsePageParam,
  parsePageSizeParam,
} from "@questorylabs/shared";
import { CostService } from "./cost.service";
import {
  COST_ROI_PAGE_SIZE,
  COST_ROI_PAGE_SIZE_MAX,
} from "./cost.constants";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";

@Controller("cost")
@UseGuards(SteamAuthGuard)
export class CostController {
  constructor(private readonly cost: CostService) {}

  @Get("summary")
  summary(@CurrentUser() user: { userId: string }) {
    return this.cost.summary(user.userId);
  }

  @Get("roi")
  roi(
    @CurrentUser() user: { userId: string },
    @Query("page") pageRaw?: string,
    @Query("pageSize") pageSizeRaw?: string,
    @Query("sort") sortRaw?: string,
    @Query("value") valueRaw?: string,
  ) {
    const page = parsePageParam(pageRaw, 1);
    const pageSize = parsePageSizeParam(
      pageSizeRaw,
      COST_ROI_PAGE_SIZE,
      COST_ROI_PAGE_SIZE_MAX,
    );
    if (page == null || pageSize == null) {
      throw new BadRequestException("Invalid page or pageSize");
    }

    const sortParsed = sortRaw
      ? CostRoiSortSchema.safeParse(sortRaw)
      : { success: true as const, data: "best" as const };
    if (!sortParsed.success) {
      throw new BadRequestException("Invalid sort");
    }

    const valueParsed = valueRaw
      ? CostRoiValueFilterSchema.safeParse(valueRaw)
      : { success: true as const, data: "all" as const };
    if (!valueParsed.success) {
      throw new BadRequestException("Invalid value");
    }

    return this.cost.roi(user.userId, {
      page,
      pageSize,
      sort: sortParsed.data,
      value: valueParsed.data,
    });
  }

  @Post("refresh-prices")
  refreshPrices(@CurrentUser() user: { userId: string }) {
    return this.cost.refreshPrices(user.userId);
  }
}
