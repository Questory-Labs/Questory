import { Module } from "@nestjs/common";
import { RewindAiService } from "./rewind-ai.service";

@Module({
  providers: [RewindAiService],
  exports: [RewindAiService],
})
export class RewindModule {}
