import { Global, Module } from "@nestjs/common";
import { EntitlementService } from "./entitlement.service";
import { EntitlementGuard } from "./entitlement.guard";

@Global()
@Module({
  providers: [EntitlementService, EntitlementGuard],
  exports: [EntitlementService, EntitlementGuard],
})
export class EntitlementsModule {}
