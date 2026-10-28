import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  UseGuards,
} from "@nestjs/common";
import { SteamAuthGuard } from "../auth/auth.guard";
import { CurrentUser } from "../auth/current-user.decorator";
import { QmonitorDevicesService } from "./qmonitor-devices.service";

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

@Controller("qmonitor/devices")
@UseGuards(SteamAuthGuard)
export class QmonitorDevicesController {
  constructor(private readonly devices: QmonitorDevicesService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.devices.list(user.userId);
  }

  @Delete(":id")
  revoke(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    if (!DEVICE_ID_PATTERN.test(id)) {
      throw new BadRequestException("Invalid device id");
    }
    return this.devices.revoke(user.userId, id);
  }
}
