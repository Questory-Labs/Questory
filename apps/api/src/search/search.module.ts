import { Module } from "@nestjs/common";
import { UsersModule } from "../watch/users/users.module";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";

@Module({
  imports: [UsersModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
