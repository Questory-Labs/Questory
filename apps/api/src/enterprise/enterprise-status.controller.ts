import { Controller, Get } from "@nestjs/common";
import { EnterpriseProxyService } from "./enterprise-proxy.service";

@Controller("enterprise")
export class EnterpriseStatusController {
  constructor(private readonly proxy: EnterpriseProxyService) {}

  @Get("status")
  status() {
    return this.proxy.forwardPublic("/v1/enterprise/status");
  }
}
