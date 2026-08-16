import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { EntitlementFeature } from "@questorylabs/shared";
import type { Request } from "express";
import { EntitlementService } from "./entitlement.service";
import type { SessionUser } from "../auth/auth.guard";

export const ENTITLEMENT_KEY = "entitlementFeature";

export const RequireEntitlement = (feature: EntitlementFeature) =>
  SetMetadata(ENTITLEMENT_KEY, feature);

@Injectable()
export class EntitlementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<EntitlementFeature>(
      ENTITLEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!feature) return true;

    const req = context.switchToHttp().getRequest<Request & SessionUser>();
    if (!req.userId) throw new UnauthorizedException("Not authenticated");

    const allowed = await this.entitlements.isAllowed(req.userId, feature);
    if (!allowed) {
      throw new ForbiddenException({
        code: "feature_not_entitled",
        message: "This feature is not available on your plan",
      });
    }
    return true;
  }
}
