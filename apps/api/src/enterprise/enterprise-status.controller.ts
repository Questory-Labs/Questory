import { Controller, Get } from "@nestjs/common";
import { EnterpriseProxyService } from "./enterprise-proxy.service";

/** Public QEngine gate — availability only, no model/LLM/OTEL internals. */
export function publicEnterpriseStatus(raw: unknown): {
  available: boolean;
  service: { ok: boolean };
} {
  const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const service =
    body.service && typeof body.service === "object"
      ? (body.service as Record<string, unknown>)
      : {};
  return {
    available: body.available === true,
    service: { ok: service.ok === true },
  };
}

@Controller("enterprise")
export class EnterpriseStatusController {
  constructor(private readonly proxy: EnterpriseProxyService) {}

  @Get("status")
  async status() {
    const raw = await this.proxy.forwardPublic<unknown>("/v1/enterprise/status");
    return publicEnterpriseStatus(raw);
  }
}
