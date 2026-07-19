import { Module } from "@nestjs/common";
import { FamilyController } from "./family.controller";
import { FamilyService } from "./family.service";
import { SteamModule } from "../steam/steam.module";
import { AccountsModule } from "../accounts/accounts.module";

@Module({
  imports: [SteamModule, AccountsModule],
  controllers: [FamilyController],
  providers: [FamilyService],
})
export class FamilyModule {}
