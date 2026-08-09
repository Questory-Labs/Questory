import { Module } from "@nestjs/common";
import { ReadAuthModule } from "../auth/auth.module";
import { OpenLibraryController } from "./openlibrary.controller";

@Module({
  imports: [ReadAuthModule],
  controllers: [OpenLibraryController],
})
export class ReadOpenLibraryModule {}
