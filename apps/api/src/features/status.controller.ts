import { Controller, Get, Header } from "@nestjs/common";
import { FeatureFlagsService } from "./feature-flags.service";

@Controller("status")
export class StatusController {
  constructor(private readonly flags: FeatureFlagsService) {}

  @Get()
  @Header("Cache-Control", "no-store")
  get() {
    return this.flags.getPublicStatus();
  }
}
