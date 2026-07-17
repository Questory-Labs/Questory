import { Module } from "@nestjs/common";
import { CostController } from "./cost.controller";
import { CostService } from "./cost.service";
import { SyncModule } from "../sync/sync.module";

@Module({
  imports: [SyncModule],
  controllers: [CostController],
  providers: [CostService],
  exports: [CostService],
})
export class CostModule {}
