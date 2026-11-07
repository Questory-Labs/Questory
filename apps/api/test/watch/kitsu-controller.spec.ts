import { KitsuController } from "../../src/watch/kitsu/kitsu.controller";
import { SessionUserGuard } from "../../src/watch/auth/session-user.guard";
import type { KitsuService } from "../../src/watch/kitsu/kitsu.service";
import { describeConnectController } from "./list-provider-controller-cases";

describeConnectController({
  label: "Watch Kitsu",
  path: "watch/kitsu",
  Controller: KitsuController,
  guard: SessionUserGuard,
  build: (service) => new KitsuController(service as unknown as KitsuService),
});
