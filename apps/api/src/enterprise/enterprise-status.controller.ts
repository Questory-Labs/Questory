import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";
import { EnterpriseProxyService } from "./enterprise-proxy.service";
import { EntitlementService } from "../entitlements/entitlement.service";
import { readSession } from "../auth/session";

@Controller("enterprise")
export class EnterpriseStatusController {
  constructor(
    private readonly proxy: EnterpriseProxyService,
    private readonly entitlements: EntitlementService,
  ) {}

  @Get("status")
  async status(@Req() req: Request) {
    let base: {
      available?: boolean;
      service?: { ok?: boolean; ready?: boolean; model?: string };
    } = { available: false };
    try {
      base = await this.proxy.forwardPublic("/v1/enterprise/status");
    } catch {
      base = { available: false };
    }

    const session = readSession(req);
    let entitled = false;
    if (session) {
      try {
        entitled = await this.entitlements.isAllowed(
          session.userId,
          "recommendations",
        );
      } catch {
        entitled = false;
      }
    }

    return { ...base, entitled };
  }
}
