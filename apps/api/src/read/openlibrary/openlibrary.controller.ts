import {
  Controller,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ReadSessionUserGuard } from "../auth/session-user.guard";

@Controller("read/openlibrary")
@UseGuards(ReadSessionUserGuard)
export class OpenLibraryController {
  @Post("sync")
  async syncOpenLibrary() {
    // Placeholder until Open Library ingest is implemented.
    return {
      status: "pending",
      message: "OpenLibrary sync is not implemented yet.",
    };
  }
}
