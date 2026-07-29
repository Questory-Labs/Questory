import { Module, forwardRef } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { CatalogModule } from "../catalog/catalog.module";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CorrectionsController } from "./corrections.controller";
import { CorrectionsService } from "./corrections.service";

@Module({
  imports: [UsersModule, forwardRef(() => CatalogModule)],
  controllers: [CorrectionsController],
  providers: [CorrectionsService, SessionUserGuard],
  exports: [CorrectionsService],
})
export class CorrectionsModule {}
