import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { ReadLibraryController } from "./library.controller";
import { ReadLibraryService } from "./library.service";

@Module({
  imports: [ReadAuthModule],
  controllers: [ReadLibraryController],
  providers: [ReadLibraryService],
})
export class ReadLibraryModule {}
