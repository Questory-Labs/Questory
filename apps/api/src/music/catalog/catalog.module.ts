import { Module, forwardRef } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { CorrectionsModule } from "../corrections/corrections.module";
import { SessionUserGuard } from "../auth/session-user.guard";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [UsersModule, forwardRef(() => CorrectionsModule)],
  controllers: [CatalogController],
  providers: [CatalogService, SessionUserGuard],
  exports: [CatalogService],
})
export class CatalogModule {}