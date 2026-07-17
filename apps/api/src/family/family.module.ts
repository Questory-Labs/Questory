import { Module } from "@nestjs/common";
import { FamilyController } from "./family.controller";
import { FamilyService } from "./family.service";
import { SteamModule } from "../steam/steam.module";

@Module({
  imports: [SteamModule],
  controllers: [FamilyController],
  providers: [FamilyService],
})
export class FamilyModule {}
