import { Module } from "@nestjs/common";
import { LibraryController } from "./library.controller";
import { LibraryService } from "./library.service";
import { BacklogService } from "./backlog.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [LibraryController],
  providers: [LibraryService, BacklogService],
  exports: [LibraryService, BacklogService],
})
export class LibraryModule {}
