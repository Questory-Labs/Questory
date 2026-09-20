import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import { FeatureFlagsService } from "./feature-flags.service";
import { matchFeatureRoute } from "./feature-http.rules";

@Injectable()
export class FeatureHttpGuard implements CanActivate {
  constructor(private readonly flags: FeatureFlagsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== "http") return true;
    const req = context.switchToHttp().getRequest<Request>();
    const url = req.originalUrl || req.url || "";
    const match = matchFeatureRoute(url);
    if (!match) return true;
    await this.flags.assertDomainEnabled(match.domain);
    if (match.source) {
      await this.flags.assertSourceEnabled(match.source);
    }
    return true;
  }
}
