import { ReadKitsuController } from "../../src/read/kitsu/kitsu.controller";
import { ReadSessionUserGuard } from "../../src/read/auth/session-user.guard";
import type { KitsuService } from "../../src/watch/kitsu/kitsu.service";
import { describeConnectController } from "../watch/list-provider-controller-cases";

describeConnectController({
  label: "Read Kitsu",
  path: "read/kitsu",
  Controller: ReadKitsuController,
  guard: ReadSessionUserGuard,
  build: (service) => new ReadKitsuController(service as unknown as KitsuService),
});
