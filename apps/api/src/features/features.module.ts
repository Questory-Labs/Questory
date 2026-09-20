import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { FeatureFlagsService } from "./feature-flags.service";
import { FeatureHttpGuard } from "./feature-http.guard";
import { StatusController } from "./status.controller";

@Global()
@Module({
  controllers: [StatusController],
  providers: [
    FeatureFlagsService,
    FeatureHttpGuard,
    { provide: APP_GUARD, useExisting: FeatureHttpGuard },
  ],
  exports: [FeatureFlagsService],
})
export class FeaturesModule {}
